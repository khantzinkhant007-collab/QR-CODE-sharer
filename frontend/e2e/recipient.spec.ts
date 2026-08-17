import { expect, test } from '@playwright/test'

const availablePage = `<!doctype html><html><body><h1>shared-photo.jpg</h1><a href="http://127.0.0.1:8000/d/valid/file">Download file</a></body></html>`

test('recipient opens a public page and downloads without an app', async ({ page }) => {
  await page.route('http://127.0.0.1:8000/d/valid', (route) => route.fulfill({ status: 200, contentType: 'text/html', body: availablePage }))
  await page.route('http://127.0.0.1:8000/d/valid/file', (route) => route.fulfill({ status: 200, headers: { 'Content-Disposition': 'attachment; filename="shared-photo.jpg"', 'Content-Type': 'image/jpeg' }, body: 'private-file' }))
  await page.goto('http://127.0.0.1:8000/d/valid')
  await expect(page.getByRole('heading', { name: 'shared-photo.jpg' })).toBeVisible()
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('link', { name: 'Download file' }).click()
  await expect((await downloadPromise).suggestedFilename()).toBe('shared-photo.jpg')
})

test('expired and invalid links return their terminal states', async ({ page }) => {
  await page.route('http://127.0.0.1:8000/d/expired', (route) => route.fulfill({ status: 410, contentType: 'text/html', body: '<h1>This link has expired.</h1>' }))
  await page.route('http://127.0.0.1:8000/d/invalid', (route) => route.fulfill({ status: 404, contentType: 'text/html', body: '<h1>Not Found</h1>' }))
  const expired = await page.goto('http://127.0.0.1:8000/d/expired')
  expect(expired?.status()).toBe(410)
  await expect(page.getByRole('heading', { name: 'This link has expired.' })).toBeVisible()
  const invalid = await page.goto('http://127.0.0.1:8000/d/invalid')
  expect(invalid?.status()).toBe(404)
})

test('one-download file cannot be downloaded twice', async ({ page }) => {
  let downloads = 0
  await page.route('http://127.0.0.1:8000/d/once', (route) => route.fulfill({ status: 200, contentType: 'text/html', body: availablePage.replaceAll('/valid/', '/once/') }))
  await page.route('http://127.0.0.1:8000/d/once/file', (route) => {
    downloads++
    if (downloads > 1) return route.fulfill({ status: 410, contentType: 'text/plain', body: 'Download limit reached' })
    return route.fulfill({ status: 200, headers: { 'Content-Disposition': 'attachment; filename="shared-photo.jpg"' }, body: 'private-file' })
  })
  await page.goto('http://127.0.0.1:8000/d/once')
  const firstDownload = page.waitForEvent('download')
  await page.getByRole('link', { name: 'Download file' }).click()
  await firstDownload
  const second = await page.goto('http://127.0.0.1:8000/d/once/file')
  expect(second?.status()).toBe(410)
})
