import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { I18nProvider } from '../i18n'
import { TextQrPage } from './TextQrPage'

const mocks = vi.hoisted(() => ({ generate: vi.fn(), copy: vi.fn() }))
vi.mock('../lib/payloadQr', async (original) => ({ ...await original<typeof import('../lib/payloadQr')>(), generatePayloadQr: mocks.generate }))
vi.mock('../lib/share', () => ({ copyText: mocks.copy, dataUrlToFile: vi.fn() }))
beforeEach(() => {
  vi.resetAllMocks()
  mocks.generate.mockResolvedValue('data:image/png;base64,cXI=')
  mocks.copy.mockResolvedValue(undefined)
})
afterEach(cleanup)
const openPage = () => render(<I18nProvider><TextQrPage /></I18nProvider>)

describe('Text & Links QR tab', () => {
  it('creates a website QR locally and copies its normalized content', async () => {
    openPage()
    await userEvent.type(screen.getByLabelText('Website URL'), 'example.com')
    await userEvent.click(screen.getByRole('button', { name: 'Create QR code' }))
    expect(await screen.findByAltText('QR code containing your text or link')).toBeVisible()
    expect(mocks.generate).toHaveBeenCalledExactlyOnceWith('https://example.com/')
    expect(screen.getByRole('link', { name: 'Save QR as PNG' })).toHaveAttribute('download', 'scansend-qr.png')
    expect(screen.getByRole('link', { name: 'Save QR as PNG' })).toHaveAttribute('href', 'data:image/png;base64,cXI=')
    await userEvent.click(screen.getByRole('button', { name: 'Copy content' }))
    expect(mocks.copy).toHaveBeenCalledExactlyOnceWith('https://example.com/')
    expect(screen.getByText(/It has no expiry, password or delete control/)).toBeVisible()
  })

  it('supports multiline Unicode text and removes a stale QR when edited', async () => {
    openPage()
    await userEvent.click(screen.getByRole('button', { name: 'Plain text' }))
    fireEvent.change(screen.getByLabelText('Your message'), { target: { value: 'こんにちは\nWelcome 🎉' } })
    await userEvent.click(screen.getByRole('button', { name: 'Create QR code' }))
    expect(await screen.findByAltText('QR code containing your text or link')).toBeVisible()
    expect(mocks.generate).toHaveBeenCalledExactlyOnceWith('こんにちは\nWelcome 🎉')
    await userEvent.type(screen.getByLabelText('Your message'), '!')
    expect(screen.queryByAltText('QR code containing your text or link')).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Save QR as PNG' })).not.toBeInTheDocument()
  })

  it('rejects an unsafe link without generating a QR', async () => {
    openPage()
    await userEvent.type(screen.getByLabelText('Website URL'), 'javascript:alert(1)')
    await userEvent.click(screen.getByRole('button', { name: 'Create QR code' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('valid HTTP or HTTPS')
    expect(mocks.generate).not.toHaveBeenCalled()
  })

  it('rejects oversized UTF-8 text', async () => {
    openPage()
    await userEvent.click(screen.getByRole('button', { name: 'Plain text' }))
    fireEvent.change(screen.getByLabelText('Your message'), { target: { value: 'あ'.repeat(334) } })
    await userEvent.click(screen.getByRole('button', { name: 'Create QR code' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('1000 UTF-8 bytes')
    expect(mocks.generate).not.toHaveBeenCalled()
  })

  it('does not show an old asynchronous QR after changing the content', async () => {
    let resolve!: (data: string) => void
    mocks.generate.mockImplementationOnce(() => new Promise((done) => { resolve = done }))
    openPage()
    await userEvent.type(screen.getByLabelText('Website URL'), 'https://old.example.com')
    await userEvent.click(screen.getByRole('button', { name: 'Create QR code' }))
    fireEvent.change(screen.getByLabelText('Website URL'), { target: { value: 'https://new.example.com' } })
    await act(async () => resolve('data:image/png;base64,b2xk'))
    expect(screen.queryByAltText('QR code containing your text or link')).not.toBeInTheDocument()
  })

  it('handles generator and clipboard failures without an unhandled rejection', async () => {
    mocks.generate.mockRejectedValueOnce(new Error('generator unavailable'))
    openPage()
    await userEvent.type(screen.getByLabelText('Website URL'), 'https://example.com')
    await userEvent.click(screen.getByRole('button', { name: 'Create QR code' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not create this QR')
    await userEvent.click(screen.getByRole('button', { name: 'Create QR code' }))
    await screen.findByAltText('QR code containing your text or link')
    mocks.copy.mockRejectedValueOnce(new Error('Clipboard blocked'))
    await userEvent.click(screen.getByRole('button', { name: 'Copy content' }))
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Could not copy'))
  })
})
