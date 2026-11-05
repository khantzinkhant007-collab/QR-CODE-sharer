import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { I18nProvider } from '../i18n'
import type { UploadRecord } from '../types'
import { SharePage } from './SharePage'

const mocks = vi.hoisted(() => ({ get: vi.fn(), status: vi.fn(), delete: vi.fn(), online: true }))
vi.mock('../lib/history', () => ({ getUpload: mocks.get, setUploadStatus: mocks.status }))
vi.mock('../api/uploadClient', () => ({ deleteRemoteUpload: mocks.delete, fetchUploadStatus: vi.fn(() => new Promise(() => {})) }))
vi.mock('../lib/qr', () => ({ generateQrDataUrl: vi.fn().mockResolvedValue('data:image/png;base64,dGVzdA==') }))
vi.mock('../hooks/useOnlineStatus', () => ({ useOnlineStatus: () => mocks.online }))

const record: UploadRecord = {
  id: 'example-attachment', originalName: 'class-notes.pdf', mimeType: 'application/pdf', sizeBytes: 1024,
  downloadUrl: 'https://example.test/d/attachment', expiresAt: '2099-01-01T00:00:00Z', maxDownloads: null,
  downloadCount: 0, managementToken: 'test-management-token', createdAt: '2026-10-01T00:00:00Z', localStatus: 'active',
}

function openShare() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } } })
  const view = () => <QueryClientProvider client={client}><I18nProvider><MemoryRouter initialEntries={[`/share/${record.id}`]}><Routes><Route path="/share/:uploadId" element={<SharePage />} /></Routes></MemoryRouter></I18nProvider></QueryClientProvider>
  const result = render(view())
  return { ...result, client, refresh: () => result.rerender(view()) }
}

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  vi.spyOn(window.navigator, 'language', 'get').mockReturnValue('en-US')
  mocks.online = true
  mocks.get.mockResolvedValue(record)
  mocks.status.mockImplementation(async (_id: string, status: string) => {
    if (status === 'deleted') mocks.get.mockResolvedValue({ ...record, localStatus: 'deleted' })
  })
  mocks.delete.mockReset().mockResolvedValue({ status: 'deleted' })
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', { configurable: true, value() { this.setAttribute('open', '') } })
  Object.defineProperty(HTMLDialogElement.prototype, 'close', { configurable: true, value() { this.removeAttribute('open') } })
  vi.spyOn(window, 'confirm').mockReturnValue(false)
})
afterEach(() => { cleanup(); vi.restoreAllMocks() })

describe('Send result deletion confirmation', () => {
  it('uses the History glass dialog and lets Cancel leave the file untouched', async () => {
    openShare()
    await userEvent.click(await screen.findByRole('button', { name: 'Delete upload' }))
    const dialog = screen.getByRole('dialog', { name: 'Delete this file?' })
    expect(dialog).toHaveClass('confirm-dialog', 'glass-panel')
    expect(dialog).toHaveAccessibleDescription('Delete the private file and permanently disable its QR link?')
    expect(within(dialog).getByText(record.originalName)).toBeVisible()
    expect(within(dialog).getByRole('button', { name: 'Cancel' })).toHaveFocus()
    expect(window.confirm).not.toHaveBeenCalled()
    expect(mocks.delete).not.toHaveBeenCalled()
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(mocks.delete).not.toHaveBeenCalled()
  })

  it('deletes only after confirmation and refreshes the share and history caches', async () => {
    const { client } = openShare()
    const invalidate = vi.spyOn(client, 'invalidateQueries')
    await userEvent.click(await screen.findByRole('button', { name: 'Delete upload' }))
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete everywhere' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(mocks.delete).toHaveBeenCalledExactlyOnceWith(record.id, record.managementToken)
    expect(mocks.status).toHaveBeenCalledWith(record.id, 'deleted')
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['upload', record.id] })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['history'] })
    expect(screen.queryByRole('button', { name: 'Delete upload' })).not.toBeInTheDocument()
  })

  it('prevents repeat deletion and Escape dismissal while the request is pending', async () => {
    let finish!: (value: { status: string }) => void
    mocks.delete.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve }))
    openShare()
    await userEvent.click(await screen.findByRole('button', { name: 'Delete upload' }))
    const dialog = screen.getByRole('dialog')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Delete everywhere' }))
    expect(dialog).toHaveAttribute('aria-busy', 'true')
    expect(within(dialog).getByRole('button', { name: 'Cancel' })).toBeDisabled()
    expect(within(dialog).getByRole('button', { name: 'Delete everywhere' })).toBeDisabled()
    fireEvent(dialog, new Event('cancel', { cancelable: true }))
    expect(dialog).toBeInTheDocument()
    finish({ status: 'deleted' })
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(mocks.delete).toHaveBeenCalledTimes(1)
  })

  it('shows errors inside the dialog, retries, and resets errors when reopened', async () => {
    mocks.delete.mockRejectedValueOnce(new Error('Network failed'))
    openShare()
    await userEvent.click(await screen.findByRole('button', { name: 'Delete upload' }))
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete everywhere' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not delete the server file.')
    expect(mocks.status).not.toHaveBeenCalled()
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel' }))
    await userEvent.click(screen.getByRole('button', { name: 'Delete upload' }))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete everywhere' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(mocks.delete).toHaveBeenCalledTimes(2)
  })

  it('allows Escape to cancel without deleting', async () => {
    openShare()
    await userEvent.click(await screen.findByRole('button', { name: 'Delete upload' }))
    fireEvent(screen.getByRole('dialog'), new Event('cancel', { cancelable: true }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(mocks.delete).not.toHaveBeenCalled()
  })

  it('disables deletion when offline', async () => {
    mocks.online = false
    openShare()
    expect(await screen.findByRole('button', { name: 'Delete upload' })).toBeDisabled()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(mocks.delete).not.toHaveBeenCalled()
  })

  it('keeps an open dialog cancelable but blocks deletion if connectivity is lost', async () => {
    const { refresh } = openShare()
    await userEvent.click(await screen.findByRole('button', { name: 'Delete upload' }))
    mocks.online = false
    refresh()
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByRole('alert')).toHaveTextContent('You are offline. Reconnect to delete the server file, or cancel.')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Delete everywhere' }))
    expect(mocks.delete).not.toHaveBeenCalled()
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('uses the same Japanese title, warning, and buttons as History', async () => {
    vi.spyOn(window.navigator, 'language', 'get').mockReturnValue('ja-JP')
    openShare()
    await userEvent.click(await screen.findByRole('button', { name: 'アップロードを削除' }))
    const dialog = screen.getByRole('dialog', { name: 'ファイルを削除しますか？' })
    expect(dialog).toHaveAccessibleDescription('非公開ファイルを削除し、QRリンクを永久に無効にしますか？')
    expect(within(dialog).getByRole('button', { name: 'キャンセル' })).toBeVisible()
    expect(within(dialog).getByRole('button', { name: 'サーバーから削除' })).toBeVisible()
    expect(window.confirm).not.toHaveBeenCalled()
  })
})
