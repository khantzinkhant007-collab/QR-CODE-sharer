import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { I18nProvider } from '../i18n'
import { CollectionsPage } from './CollectionsPage'

const mocks = vi.hoisted(() => ({ create: vi.fn(), save: vi.fn(), list: vi.fn(async () => []) }))
vi.mock('../api/collectionClient', () => ({ createCollection: mocks.create }))
vi.mock('../lib/history', () => ({ saveCollection: mocks.save, listCollections: mocks.list }))
afterEach(() => { cleanup(); vi.clearAllMocks() })

describe('collection creation', () => {
  it('creates an empty collection and saves creator access before opening the shared gallery', async () => {
    const record = { id: 'event', token: 'public', title: 'Festival', shareUrl: 'https://app.test/events/public', managementToken: 'creator-secret', expiresAt: '2099-01-01T00:00:00Z', createdAt: '2026-01-01T00:00:00Z' }
    mocks.create.mockResolvedValue(record)
    const router = createMemoryRouter([{ path: '/events', element: <CollectionsPage /> }, { path: '/events/:token', element: <p>Shared gallery opened</p> }], { initialEntries: ['/events'] })
    const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
    const { container } = render(<QueryClientProvider client={client}><I18nProvider><RouterProvider router={router} /></I18nProvider></QueryClientProvider>)
    expect(container.querySelector('input[type="file"]')).toBeNull()
    await userEvent.type(screen.getByLabelText('Event name'), 'Festival')
    await userEvent.click(screen.getByRole('button', { name: 'Create empty collection & QR' }))
    await waitFor(() => expect(mocks.save).toHaveBeenCalledWith(record))
    expect(await screen.findByText('Shared gallery opened')).toBeVisible()
    expect(mocks.create.mock.calls[0][0]).toMatchObject({ title: 'Festival', description: '' })
    expect(mocks.create.mock.calls[0][0]).not.toHaveProperty('file')
  })
})
