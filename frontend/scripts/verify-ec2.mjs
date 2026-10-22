import assert from 'node:assert/strict'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { chromium, expect as baseExpect } from '@playwright/test'
import sharp from 'sharp'

const expect = baseExpect.configure({ timeout: 20000 })
const baseURL = process.env.VERIFY_BASE_URL || 'https://15.168.129.246'
const out = new URL('../../outputs/aws-ec2/', import.meta.url)
await mkdir(out, { recursive: true })
const image = await sharp({ create: { width: 120, height: 80, channels: 3, background: '#087f82' } }).png().toBuffer()
const digest = (bytes) => createHash('sha256').update(bytes).digest('hex')
const results = []
const uploads = []
const collections = []
const browser = await chromium.launch({ channel: 'msedge', headless: true })
const sender = await browser.newContext({ baseURL, viewport: { width: 1440, height: 1000 } })
const recipient = await browser.newContext({ baseURL, viewport: { width: 390, height: 844 } })
const api = sender.request
const page = await sender.newPage()
const jsErrors = []
page.on('pageerror', (error) => jsErrors.push(error.message))
async function check(name, fn) { await fn(); results.push(name); console.log(`PASS: ${name}`) }
async function json(response, status) { assert.equal(response.status(), status); return (await response.json()).data }
try {
  await check('Trusted HTTPS, health endpoint and HTTP redirect', async () => {
    assert.equal((await api.get('/up')).status(), 200)
    const redirect = await api.get(baseURL.replace('https:', 'http:'), { maxRedirects: 0 })
    assert.equal(redirect.status(), 308)
    assert.equal(redirect.headers().location, baseURL + '/')
  })
  await check('Desktop UI, secure context and security headers', async () => {
    const response = await page.goto('/')
    assert.equal(response.status(), 200)
    assert.equal(response.headers()['x-frame-options'], 'DENY')
    assert.equal(response.headers()['x-content-type-options'], 'nosniff')
    await expect(page.getByRole('button', { name: 'Choose Photo or Video' }).first()).toBeVisible()
    assert.equal(await page.evaluate(() => window.isSecureContext), true)
    await page.screenshot({ path: fileURLToPath(new URL('desktop.png', out)), fullPage: true })
  })
  let upload
  await check('Real browser upload, local QR generation and sender history', async () => {
    await page.locator('input[type=file]').first().setInputFiles({ name: 'ec2-verification.png', mimeType: 'image/png', buffer: image })
    await page.getByLabel('Allow only one download').check()
    const response = page.waitForResponse((r) => r.request().method() === 'POST' && r.url().endsWith('/api/v1/uploads'))
    await page.getByRole('button', { name: 'Create secure QR link' }).click()
    upload = await json(await response, 201)
    uploads.push(upload)
    assert.ok(upload.download_url.startsWith(baseURL + '/d/'))
    await expect(page.getByRole('heading', { name: 'Ready to scan' })).toBeVisible()
    await expect(page.getByRole('img', { name: /QR download link/ })).toBeVisible()
    await page.screenshot({ path: fileURLToPath(new URL('qr-share.png', out)), fullPage: true })
  })
  const receiverPage = await recipient.newPage()
  receiverPage.on('pageerror', (error) => jsErrors.push(error.message))
  await check('Account-free recipient download, exact bytes and one-download enforcement', async () => {
    await receiverPage.goto(upload.download_url)
    await expect(receiverPage.getByRole('heading', { name: 'ec2-verification.png' })).toBeVisible()
    assert.equal((await recipient.request.head(upload.download_url + '/file')).status(), 200)
    const pending = receiverPage.waitForEvent('download')
    await receiverPage.getByRole('link', { name: 'Download file' }).click()
    const download = await pending
    assert.equal(download.suggestedFilename(), 'ec2-verification.png')
    assert.equal(digest(await readFile(await download.path())), digest(image))
    assert.equal((await recipient.request.get(upload.download_url + '/file')).status(), 410)
  })
  await check('Sender deletion removes the file', async () => {
    page.once('dialog', (dialog) => dialog.accept())
    await page.getByRole('button', { name: 'Delete upload' }).click()
    await expect(page.getByText('Deleted', { exact: true })).toBeVisible()
    const status = await json(await api.get('/api/v1/uploads/' + upload.id, { headers: { 'X-Management-Token': upload.management_token } }), 200)
    assert.equal(status.file_exists, false)
  })
  let protectedUpload
  const password = 'EC2-verification-only-2026!'
  await check('Password gate, secure cookies and CSRF-protected browser unlock', async () => {
    protectedUpload = await json(await api.post('/api/v1/uploads', { multipart: { file: { name: 'private-verification.png', mimeType: 'image/png', buffer: image }, expires_in_minutes: '10', password } }), 201)
    uploads.push(protectedUpload)
    assert.equal(protectedUpload.password_protected, true)
    await receiverPage.goto(protectedUpload.download_url)
    await expect(receiverPage.getByLabel('Download password')).toBeVisible()
    assert.equal((await receiverPage.locator('body').innerText()).includes('private-verification.png'), false)
    assert.equal((await recipient.request.get(protectedUpload.download_url + '/file')).status(), 403)
    await receiverPage.getByLabel('Download password').fill('this-is-an-incorrect-password')
    await receiverPage.getByRole('button', { name: 'Unlock file' }).click()
    await expect(receiverPage.getByRole('alert')).not.toBeEmpty()
    await receiverPage.getByLabel('Download password').fill(password)
    await receiverPage.getByRole('button', { name: 'Unlock file' }).click()
    await expect(receiverPage.getByRole('heading', { name: 'private-verification.png' })).toBeVisible()
    const downloaded = await recipient.request.get(protectedUpload.download_url + '/file')
    assert.equal(downloaded.status(), 200)
    assert.equal(digest(await downloaded.body()), digest(image))
    assert.ok((await recipient.cookies()).some((cookie) => cookie.httpOnly && cookie.secure))
  })
  await check('Mobile layout and PWA manifest/service worker', async () => {
    await receiverPage.goto('/')
    await expect(receiverPage.getByRole('button', { name: 'Choose Photo or Video' }).first()).toBeVisible({ timeout: 20000 })
    assert.equal(await receiverPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true)
    await receiverPage.screenshot({ path: fileURLToPath(new URL('mobile.png', out)), fullPage: true })
    assert.equal((await api.get('/manifest.webmanifest')).status(), 200)
    const worker = await api.get('/sw.js')
    assert.equal(worker.status(), 200)
    assert.ok(worker.headers()['cache-control'].includes('no-cache'))
  })
  await check('Event collection upload/download, owner authorization and stable shared URL', async () => {
    const collection = await json(await api.post('/api/v1/collections', { data: { title: 'EC2 deployment verification', expires_at: new Date(Date.now() + 3600000).toISOString() } }), 201)
    collections.push(collection)
    const endpoint = '/api/v1/collections/' + collection.token
    const headers = { 'X-Management-Token': collection.management_token }
    const file = await json(await recipient.request.post(endpoint + '/files', { multipart: { file: { name: 'event-verification.png', mimeType: 'image/png', buffer: image } } }), 201)
    const downloaded = await recipient.request.get(file.download_url)
    assert.equal(downloaded.status(), 200)
    assert.equal(digest(await downloaded.body()), digest(image))
    assert.equal((await recipient.request.patch(endpoint, { data: { expires_at: new Date(Date.now() + 7200000).toISOString() } })).status(), 404)
    const updated = await json(await api.patch(endpoint, { headers, data: { expires_at: new Date(Date.now() + 7200000).toISOString() } }), 200)
    assert.equal(updated.share_url, collection.share_url)
    await receiverPage.goto(collection.share_url)
    await expect(receiverPage.getByRole('heading', { name: collection.title })).toBeVisible()
    const closed = await api.delete(endpoint, { headers })
    assert.ok([200, 204].includes(closed.status()))
    assert.equal((await recipient.request.get(endpoint)).status(), 410)
  })
  await check('Private configuration/storage and arbitrary PHP scripts are inaccessible', async () => {
    for (const path of ['/.env', '/backend/.env', '/index.php', '/backend/public/index.php']) {
      const response = await api.get(path)
      assert.ok([403, 404].includes(response.status()))
    }
    assert.equal(jsErrors.length, 0, jsErrors.join('\n'))
  })
} finally {
  for (const upload of uploads) await api.delete('/api/v1/uploads/' + upload.id, { headers: { 'X-Management-Token': upload.management_token } }).catch(() => {})
  for (const collection of collections) await api.delete('/api/v1/collections/' + collection.token, { headers: { 'X-Management-Token': collection.management_token } }).catch(() => {})
  await writeFile(new URL('verification.json', out), JSON.stringify({ baseURL, checkedAt: new Date().toISOString(), passed: results, javascriptErrors: jsErrors, largeUploadTested: false }, null, 2))
  await browser.close()
}
