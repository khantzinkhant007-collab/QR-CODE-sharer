import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { I18nProvider } from '../i18n'
import type { UploadRecord } from '../types'
import { HistoryPage } from './HistoryPage'

const mocks = vi.hoisted(() => ({ list: vi.fn(), remove: vi.fn(), status: vi.fn(), delete: vi.fn(), online: true }))
vi.mock('../lib/history', () => ({ listUploads: mocks.list, removeLocalUpload: mocks.remove, setUploadStatus: mocks.status, effectiveUploadStatus: (record: UploadRecord) => record.localStatus }))
vi.mock('../api/uploadClient', () => ({ deleteRemoteUpload: mocks.delete, fetchUploadStatus: vi.fn() }))
vi.mock('../hooks/useOnlineStatus', () => ({ useOnlineStatus: () => mocks.online }))

const record: UploadRecord = {
  id: 'example-photo', originalName: 'class-photo.jpg', mimeType: 'image/jpeg', sizeBytes: 1024,
  downloadUrl: 'https://example.test/d/photo', expiresAt: '2099-01-01T00:00:00Z', maxDownloads: null,
  downloadCount: 0, managementToken: 'test-management-token', createdAt: '2026-10-01T00:00:00Z', localStatus: 'active',
}

function openHistory() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } } })
  return render(<QueryClientProvider client={client}><I18nProvider><MemoryRouter><HistoryPage /></MemoryRouter></I18nProvider></QueryClientProvider>)
}

beforeEach(() => {
  vi.resetAllMocks()
  localStorage.clear()
  vi.spyOn(window.navigator, 'language', 'get').mockReturnValue('en-US')
  mocks.online = true
  mocks.list.mockResolvedValue([record])
  mocks.remove.mockResolvedValue(undefined)
  mocks.status.mockResolvedValue(undefined)
  mocks.delete.mockResolvedValue({ status: 'deleted' })
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', { configurable: true, value() { this.setAttribute('open', '') } })
  Object.defineProperty(HTMLDialogElement.prototype, 'close', { configurable: true, value() { this.removeAttribute('open') } })
  vi.spyOn(window, 'confirm').mockReturnValue(false)
})
afterEach(() => { cleanup(); vi.restoreAllMocks() })

describe('history deletion confirmation', () => {
  it('opens a named glass dialog with the filename without deleting anything', async () => {
    openHistory()
    await userEvent.click(await screen.findByRole('button', { name: 'Delete everywhere' }))
    const dialog = screen.getByRole('dialog', { name: 'Delete this file?' })
    expect(dialog).toHaveAccessibleDescription('Delete the private file and permanently disable its QR link?')
    expect(within(dialog).getByText('class-photo.jpg')).toBeVisible()
    expect(window.confirm).not.toHaveBeenCalled()
    expect(mocks.delete).not.toHaveBeenCalled()
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(mocks.delete).not.toHaveBeenCalled()
  })

  it('deletes the selected remote file only after explicit confirmation', async () => {
    openHistory()
    await userEvent.click(await screen.findByRole('button', { name: 'Delete everywhere' }))
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete everywhere' }))
    await waitFor(() => expect(mocks.status).toHaveBeenCalledWith(record.id, 'deleted'))
    expect(mocks.delete).toHaveBeenCalledExactlyOnceWith(record.id, record.managementToken)
    expect(mocks.remove).not.toHaveBeenCalled()
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('prevents repeat actions and Escape dismissal while deletion is pending', async () => {
    let finish!: (value: { status: string }) => void
    mocks.delete.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve }))
    openHistory()
    await userEvent.click(await screen.findByRole('button', { name: 'Delete everywhere' }))
    const dialog = screen.getByRole('dialog')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Delete everywhere' }))
    expect(dialog).toHaveAttribute('aria-busy', 'true')
    expect(within(dialog).getByRole('button', { name: 'Cancel' })).toBeDisabled()
    expect(within(dialog).getByRole('button', { name: 'Delete everywhere' })).toBeDisabled()
    fireEvent(dialog, new Event('cancel', { cancelable: true }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    finish({ status: 'deleted' })
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(mocks.delete).toHaveBeenCalledTimes(1)
  })

  it('shows a failed deletion in the dialog and allows a retry', async () => {
    mocks.delete.mockRejectedValueOnce(new Error('Network failed'))
    openHistory()
    await userEvent.click(await screen.findByRole('button', { name: 'Delete everywhere' }))
    const dialog = screen.getByRole('dialog')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Delete everywhere' }))
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Could not delete the server file.')
    expect(mocks.status).not.toHaveBeenCalled()
    await userEvent.click(within(dialog).getByRole('button', { name: 'Delete everywhere' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(mocks.delete).toHaveBeenCalledTimes(2)
  })

  it('explains local-only removal and never calls the remote delete API', async () => {
    openHistory()
    await userEvent.click(await screen.findByRole('button', { name: 'Remove from this device' }))
    const dialog = screen.getByRole('dialog', { name: 'Remove from history?' })
    expect(dialog).toHaveAccessibleDescription('Remove local history? This does not delete the server file.')
    expect(mocks.remove).not.toHaveBeenCalled()
    await userEvent.click(within(dialog).getByRole('button', { name: 'Remove from this device' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(mocks.remove).toHaveBeenCalledExactlyOnceWith(record.id)
    expect(mocks.delete).not.toHaveBeenCalled()
  })

  it('allows Escape to cancel without removing history', async () => {
    openHistory()
    await userEvent.click(await screen.findByRole('button', { name: 'Remove from this device' }))
    fireEvent(screen.getByRole('dialog'), new Event('cancel', { cancelable: true }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(mocks.remove).not.toHaveBeenCalled()
    expect(mocks.delete).not.toHaveBeenCalled()
  })

  it('keeps removal errors visible and can still cancel', async () => {
    mocks.remove.mockRejectedValueOnce(new Error('IndexedDB unavailable'))
    openHistory()
    await userEvent.click(await screen.findByRole('button', { name: 'Remove from this device' }))
    const dialog = screen.getByRole('dialog')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Remove from this device' }))
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Could not remove this history entry.')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('renders the Japanese confirmation and buttons', async () => {
    vi.spyOn(window.navigator, 'language', 'get').mockReturnValue('ja-JP')
    openHistory()
    await userEvent.click(await screen.findByRole('button', { name: 'サーバーから削除' }))
    const dialog = screen.getByRole('dialog', { name: 'ファイルを削除しますか？' })
    expect(within(dialog).getByRole('button', { name: 'キャンセル' })).toBeVisible()
    expect(within(dialog).getByText(record.originalName)).toBeVisible()
    expect(window.confirm).not.toHaveBeenCalled()
  })
})
