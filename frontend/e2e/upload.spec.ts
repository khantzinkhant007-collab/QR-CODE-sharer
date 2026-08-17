import { expect, test } from '@playwright/test'

const uploadData = {
  id: '01PLAYWRIGHTUPLOAD',
  original_name: 'playwright-photo.png',
  mime_type: 'image/png',
  size_bytes: 12,
  download_url: 'https://files.example.test/d/public-download-token',
  expires_at: '2030-08-18T12:00:00Z',
  max_downloads: 1,
  download_count: 0,
  management_token: 'sender-management-token',
  status: 'active',
}

test('uploads an image, displays a QR, and sender deletion disables it', async ({ page }) => {
  await page.route('**/api/v1/uploads**', async (route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ data: uploadData }) })
      return
    }
    if (route.request().method() === 'DELETE') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: { ...uploadData, status: 'deleted', file_exists: false } }) })
      return
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: { ...uploadData, file_exists: true } }) })
  })

  await page.goto('/')
  await page.locator('input[type=file]').first().setInputFiles({
    name: 'playwright-photo.png',
    mimeType: 'image/png',
    buffer: Buffer.from('test-image'),
  })
  await expect(page.getByText('playwright-photo.png').first()).toBeVisible()
  await page.getByLabel('Allow only one download').check()
  await page.getByRole('button', { name: 'Create secure QR link' }).click()

  await expect(page).toHaveURL(/\/share\/01PLAYWRIGHTUPLOAD/)
  await expect(page.getByRole('heading', { name: 'Ready to scan' })).toBeVisible()
  await expect(page.getByRole('img', { name: /QR download link/ })).toBeVisible()

  page.once('dialog', (dialog) => dialog.accept())
  await page.getByRole('button', { name: 'Delete upload' }).click()
  await expect(page.getByText('Deleted', { exact: true })).toBeVisible()
})

test('network failure leaves the selected file ready for retry', async ({ page }) => {
  let attempts = 0
  await page.route('**/api/v1/uploads', async (route) => {
    attempts++
    if (attempts === 1) await route.abort('connectionfailed')
    else await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ data: uploadData }) })
  })
  await page.route('**/api/v1/uploads/**', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: { ...uploadData, file_exists: true } }) }))

  await page.goto('/')
  await page.locator('input[type=file]').first().setInputFiles({ name: 'playwright-photo.png', mimeType: 'image/png', buffer: Buffer.from('test-image') })
  await page.getByRole('button', { name: 'Create secure QR link' }).click()
  await expect(page.getByRole('button', { name: 'Retry upload' })).toBeVisible()
  await page.getByRole('button', { name: 'Retry upload' }).click()
  await expect(page).toHaveURL(/\/share\/01PLAYWRIGHTUPLOAD/)
})

