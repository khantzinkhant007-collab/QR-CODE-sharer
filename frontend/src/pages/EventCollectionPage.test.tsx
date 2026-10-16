import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AxiosError } from 'axios'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { I18nProvider } from '../i18n'
import { EventCollectionPage } from './EventCollectionPage'
import type { CollectionResponse } from '../types'

const mocks = vi.hoisted(() => ({ fetch: vi.fn(), upload: vi.fn(), owner: vi.fn(), update: vi.fn(), close: vi.fn(), remove: vi.fn() }))
vi.mock('../api/collectionClient', () => ({ fetchCollection: mocks.fetch, uploadCollectionFile: mocks.upload, updateCollectionExpiry: mocks.update, closeCollection: mocks.close, removeCollectionFile: mocks.remove }))
vi.mock('../lib/history', () => ({ getCollection: mocks.owner, saveCollection: vi.fn() }))
vi.mock('../lib/qr', () => ({ generateQrDataUrl: vi.fn(async () => 'data:image/png;base64,cXI=') }))

const gallery: CollectionResponse = {
  data: { id: 'event', title: 'School festival', description: 'Our memories', expires_at: '2099-10-20T12:00:00Z', status: 'active', file_count: 1, total_bytes: 4, max_files: 200, max_total_bytes: 2048 * 1024 ** 2, max_file_bytes: 2048 * 1024 ** 2, share_url: 'https://app.test/events/public' },
  files: { data: [{ id: 'photo', original_name: 'gallery-photo.jpg', mime_type: 'image/jpeg', size_bytes: 4, created_at: '2026-10-15T12:00:00Z', download_url: 'https://api.test/download/photo', preview_url: null }], current_page: 1, last_page: 1, total: 1 },
}

function openCollection() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } } })
  const router = createMemoryRouter([{ path: '/events/:collectionToken', element: <EventCollectionPage /> }], { initialEntries: ['/events/public'] })
  return render(<QueryClientProvider client={client}><I18nProvider><RouterProvider router={router} /></I18nProvider></QueryClientProvider>)
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.fetch.mockResolvedValue(gallery)
  mocks.owner.mockResolvedValue(undefined)
  mocks.upload.mockResolvedValue({ id: 'new-photo' })
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', { configurable: true, value() { this.setAttribute('open', '') } })
  Object.defineProperty(HTMLDialogElement.prototype, 'close', { configurable: true, value() { this.removeAttribute('open') } })
})
afterEach(cleanup)

describe('public event collection', () => {
  it('lets participants see and download files without creator controls', async () => {
    openCollection()
    expect(await screen.findByRole('heading', { name: 'School festival' })).toBeVisible()
    expect(screen.getByRole('link', { name: /^Download$/ })).toHaveAttribute('href', 'https://api.test/download/photo')
    expect(screen.queryByText('Creator controls')).not.toBeInTheDocument()
    expect(await screen.findByAltText('QR link to the shared event collection')).toBeVisible()
  })

  it('accepts multiple photos from a participant and refreshes the gallery', async () => {
    openCollection()
    const input = await screen.findByLabelText('Choose photos or videos')
    const first = new File(['one'], 'first.jpg', { type: 'image/jpeg' })
    const second = new File(['two'], 'second.jpg', { type: 'image/jpeg' })
    await userEvent.upload(input, [first, second])
    await userEvent.click(screen.getByRole('button', { name: 'Upload 2 file(s)' }))
    expect(await screen.findByText('2 file(s) added. Everyone with the link can download them.')).toBeVisible()
    expect(mocks.upload).toHaveBeenCalledTimes(2)
    expect(mocks.upload.mock.calls[0][1]).toBe(first)
    expect(mocks.upload.mock.calls[1][1]).toBe(second)
  })

  it('retains only the unfinished files after a partial upload failure', async () => {
    mocks.upload.mockResolvedValueOnce({ id: 'one' }).mockRejectedValueOnce(new Error('Second upload failed'))
    openCollection()
    await userEvent.upload(await screen.findByLabelText('Choose photos or videos'), [new File(['one'], 'first.jpg', { type: 'image/jpeg' }), new File(['two'], 'second.jpg', { type: 'image/jpeg' })])
    await userEvent.click(screen.getByRole('button', { name: 'Upload 2 file(s)' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Second upload failed')
    expect(screen.getByRole('button', { name: 'Upload 1 file(s)' })).toBeEnabled()
    expect(screen.queryByText('first.jpg')).not.toBeInTheDocument()
    expect(screen.getByText('second.jpg')).toBeVisible()
  })

  it('does not expose the gallery or upload controls when the server returns expired', async () => {
    mocks.fetch.mockRejectedValue(new AxiosError('Gone', 'ERR_BAD_RESPONSE', undefined, undefined, { status: 410, data: {}, statusText: 'Gone', headers: {}, config: {} as never }))
    openCollection()
    expect(await screen.findByRole('heading', { name: 'This collection is no longer available.' })).toBeVisible()
    expect(screen.queryByRole('button', { name: 'Choose photos or videos' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /^Download$/ })).not.toBeInTheDocument()
  })

  it('offers creator controls only when this browser holds the owner token', async () => {
    mocks.owner.mockResolvedValue({ id: 'event', token: 'public', managementToken: 'creator-only', expiresAt: gallery.data.expires_at })
    openCollection()
    await waitFor(() => expect(screen.getByText('Creator controls')).toBeVisible())
    expect(screen.getByRole('button', { name: 'Remove file' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Close collection' })).toBeVisible()
  })

  it('requires creator confirmation before closing the collection', async () => {
    mocks.owner.mockResolvedValue({ id: 'event', token: 'public', managementToken: 'creator-only', expiresAt: gallery.data.expires_at })
    openCollection()
    await userEvent.click(await screen.findByRole('button', { name: 'Close collection' }))
    const dialog = await screen.findByRole('dialog')
    expect(mocks.close).not.toHaveBeenCalled()
    await userEvent.click(within(dialog).getByRole('button', { name: 'Close collection' }))
    expect(await screen.findByRole('heading', { name: 'This collection is no longer available.' })).toBeVisible()
    expect(mocks.close).toHaveBeenCalledWith('public', 'creator-only')
  })

  it('lets the creator cancel a file removal without deleting anything', async () => {
    mocks.owner.mockResolvedValue({ id: 'event', token: 'public', managementToken: 'creator-only', expiresAt: gallery.data.expires_at })
    openCollection()
    await userEvent.click(await screen.findByRole('button', { name: 'Remove file' }))
    await userEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Cancel' }))
    expect(mocks.remove).not.toHaveBeenCalled()
    expect(screen.getByText('gallery-photo.jpg')).toBeVisible()
  })
})
