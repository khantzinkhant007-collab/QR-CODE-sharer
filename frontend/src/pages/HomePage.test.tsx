import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { I18nProvider } from '../i18n'
import { HomePage } from './HomePage'

const mocks = vi.hoisted(() => ({ upload: vi.fn(), save: vi.fn(), list: vi.fn() }))
vi.mock('../api/uploadClient', () => ({ uploadFile: mocks.upload, UploadCancelledError: class extends Error {} }))
vi.mock('../lib/history', () => ({ listUploads: mocks.list, saveUpload: mocks.save, effectiveUploadStatus: vi.fn() }))
vi.mock('../components/CameraCapture', () => ({ CameraCapture: () => null }))
beforeEach(() => {
  vi.resetAllMocks()
  mocks.list.mockResolvedValue([])
  mocks.save.mockResolvedValue(undefined)
  mocks.upload.mockResolvedValue({ id: 'attachment-id', originalName: 'handout.pdf', mimeType: 'application/pdf' })
})
afterEach(cleanup)

function openHome() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
  const router = createMemoryRouter([{ path: '/', element: <HomePage /> }, { path: '/share/:id', element: <p>Attachment QR page opened</p> }])
  return render(<QueryClientProvider client={client}><I18nProvider><RouterProvider router={router} /></I18nProvider></QueryClientProvider>)
}

describe('single-file attachments', () => {
  it('uploads a PDF with the selected expiry and saves management access before navigation', async () => {
    openHome()
    const file = new File(['%PDF-1.4'], 'handout.pdf', { type: 'application/pdf' })
    await userEvent.upload(screen.getByLabelText('Choose a file'), file)
    expect(screen.getByText(/Attachment ready to share/)).toBeVisible()
    await userEvent.click(screen.getByRole('radio', { name: '1 hour' }))
    await userEvent.click(screen.getByRole('button', { name: 'Create secure QR link' }))
    expect(await screen.findByText('Attachment QR page opened')).toBeVisible()
    expect(mocks.upload).toHaveBeenCalledWith(expect.objectContaining({ file, expirationMinutes: 60, maxDownloads: null }))
    expect(mocks.save).toHaveBeenCalledWith(expect.objectContaining({ id: 'attachment-id' }))
  })

  it('rejects an executable even if the file picker restriction is bypassed', async () => {
    openHome()
    fireEvent.change(screen.getByLabelText('Choose a file'), { target: { files: [new File(['x'], 'program.exe', { type: 'image/jpeg' })] } })
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Executables and web scripts are blocked'))
    expect(mocks.upload).not.toHaveBeenCalled()
    expect(screen.queryByRole('button', { name: 'Create secure QR link' })).not.toBeInTheDocument()
  })

  it('bundles multiple selected files into a single ZIP upload and supports adding or removing files', async () => {
    mocks.upload.mockResolvedValueOnce({ id: 'bundle-id', originalName: 'scansend-2-files.zip', mimeType: 'application/zip' })
    openHome()
    const first = new File(['hello'], 'notes.txt', { type: 'text/plain' })
    const second = new File(['%PDF-1.4'], 'handout.pdf', { type: 'application/pdf' })
    const third = new File(['extra'], 'extra.txt', { type: 'text/plain' })

    await userEvent.upload(screen.getByLabelText('Choose a file'), [first, second])
    expect(screen.getByText('2 files selected')).toBeVisible()
    expect(screen.getAllByText('scansend-2-files.zip').length).toBeGreaterThan(0)

    await userEvent.click(screen.getByRole('button', { name: 'Add files' }))
    await userEvent.upload(screen.getByLabelText('Choose a file'), third)
    expect(screen.getByText('3 files selected')).toBeVisible()

    await userEvent.click(screen.getByRole('button', { name: 'Remove extra.txt' }))
    expect(screen.getByText('2 files selected')).toBeVisible()

    await userEvent.click(screen.getByRole('button', { name: 'Create secure QR link' }))
    expect(await screen.findByText('Attachment QR page opened')).toBeVisible()
    expect(mocks.upload).toHaveBeenCalledTimes(1)
    const uploadedFile = mocks.upload.mock.calls[0][0].file as File
    expect(uploadedFile.name).toBe('scansend-2-files.zip')
    expect(uploadedFile.type).toBe('application/zip')
    expect(mocks.save).toHaveBeenCalledWith(expect.objectContaining({ id: 'bundle-id' }))
  })
})
