import { beforeEach, describe, expect, it, vi } from 'vitest'
import { closeCollection, createCollection, fetchCollection, removeCollectionFile, updateCollectionExpiry, uploadCollectionFile } from './collectionClient'

const api = vi.hoisted(() => ({ post: vi.fn(), get: vi.fn(), patch: vi.fn(), delete: vi.fn() }))
vi.mock('./client', () => ({ api }))
beforeEach(() => vi.clearAllMocks())

describe('event collection API client', () => {
  it('creates an empty link without uploading a file', async () => {
    api.post.mockResolvedValue({ data: { data: { id: 'event', title: 'Festival', token: 'public', management_token: 'secret', expires_at: '2030-01-01T00:00:00Z', share_url: 'https://app.test/events/public' } } })
    const values = { title: 'Festival', description: '', expires_at: '2030-01-01T00:00:00Z' }
    const result = await createCollection(values)
    expect(api.post).toHaveBeenCalledWith('/api/v1/collections', values)
    expect(result).toMatchObject({ managementToken: 'secret', token: 'public', shareUrl: 'https://app.test/events/public' })
  })

  it('allows anonymous gallery access and multipart contributions without creator credentials', async () => {
    api.get.mockResolvedValue({ data: { data: {}, files: { data: [] } } })
    api.post.mockResolvedValue({ data: { data: { id: 'photo' } } })
    await fetchCollection('public', 2)
    expect(api.get).toHaveBeenCalledWith('/api/v1/collections/public', { params: { page: 2 } })
    const file = new File(['data'], 'photo.jpg', { type: 'image/jpeg' })
    await uploadCollectionFile('public', file, new AbortController().signal, vi.fn())
    expect(api.post.mock.calls[0][1].get('file')).toEqual(file)
    expect(api.post.mock.calls[0][2]).not.toHaveProperty('headers')
  })

  it('sends creator credentials only in headers for moderation and deadline changes', async () => {
    api.patch.mockResolvedValue({ data: { data: {} } })
    await updateCollectionExpiry('public', 'secret', '2030-01-01T00:00:00Z')
    await removeCollectionFile('public', 'photo', 'secret')
    await closeCollection('public', 'secret')
    const headers = { headers: { 'X-Management-Token': 'secret' } }
    expect(api.patch).toHaveBeenCalledWith('/api/v1/collections/public', { expires_at: '2030-01-01T00:00:00Z' }, headers)
    expect(api.delete).toHaveBeenCalledWith('/api/v1/collections/public/files/photo', headers)
    expect(api.delete).toHaveBeenCalledWith('/api/v1/collections/public', headers)
  })
})
