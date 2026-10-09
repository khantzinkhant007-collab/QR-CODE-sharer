import { AxiosError, CanceledError } from 'axios'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { calculateUploadProgress, deleteRemoteUpload, fetchUploadStatus, mapApiError, uploadFile, UploadCancelledError } from './uploadClient'

const apiMocks = vi.hoisted(() => ({ post: vi.fn(), get: vi.fn(), delete: vi.fn() }))

vi.mock('axios', async (importOriginal) => {
  const actual = await importOriginal<typeof import('axios')>()
  const wrapped = Object.assign((...args: unknown[]) => actual.default(...args as Parameters<typeof actual.default>), actual.default, {
    create: () => apiMocks,
  })
  return { ...actual, default: wrapped }
})

const apiData = {
  id: '01UPLOAD', original_name: 'photo.jpg', mime_type: 'image/jpeg', size_bytes: 4,
  download_url: 'https://files.test/d/token', expires_at: '2030-01-01T00:00:00Z',
  max_downloads: null, download_count: 0, management_token: 'management', status: 'active' as const,
}

beforeEach(() => vi.clearAllMocks())

describe('upload client', () => {
  it('reports real bytes, percent, speed, and ETA', () => {
    expect(calculateUploadProgress({ loaded: 50, total: 100 }, 100, 1_000, 2_000)).toEqual({
      loaded: 50, total: 100, percent: 50, bytesPerSecond: 50, etaSeconds: 1,
    })
  })

  it('uploads multipart binary data and emits progress only before backend success', async () => {
    apiMocks.post.mockImplementation(async (_url, body: FormData, config) => {
      expect(body.get('file')).toBeInstanceOf(File)
      expect(body.has('password')).toBe(false)
      config.onUploadProgress({ loaded: 4, total: 4 })
      return { data: { data: apiData } }
    })
    const onProgress = vi.fn()
    const result = await uploadFile({
      file: new File(['data'], 'photo.jpg', { type: 'image/jpeg' }), expirationMinutes: 1440,
      maxDownloads: null, signal: new AbortController().signal, onProgress,
    })
    expect(onProgress).toHaveBeenCalledWith(expect.objectContaining({ loaded: 4, total: 4, percent: 100 }))
    expect(result).toMatchObject({ id: '01UPLOAD', managementToken: 'management', localStatus: 'active' })
  })

  it('maps cancellation distinctly so the UI can retry', async () => {
    apiMocks.post.mockRejectedValue(new CanceledError())
    await expect(uploadFile({
      file: new File(['data'], 'photo.jpg', { type: 'image/jpeg' }), expirationMinutes: 10,
      maxDownloads: 1, signal: new AbortController().signal, onProgress: vi.fn(),
    })).rejects.toBeInstanceOf(UploadCancelledError)
  })

  it('sends the password only in the request body, never in saved history or the link', async () => {
    const password = 'a long private passphrase'
    apiMocks.post.mockImplementation(async (url, body: FormData) => {
      expect(url).toBe('/api/v1/uploads')
      expect(body.get('password')).toBe(password)
      return { data: { data: { ...apiData, password_protected: true } } }
    })
    const result = await uploadFile({
      file: new File(['data'], 'photo.jpg', { type: 'image/jpeg' }), expirationMinutes: 60,
      maxDownloads: 1, password, signal: new AbortController().signal, onProgress: vi.fn(),
    })
    expect(result.passwordProtected).toBe(true)
    expect(JSON.stringify(result)).not.toContain(password)
    expect(result.downloadUrl).toBe(apiData.download_url)
  })

  it('maps network and API failures', () => {
    expect(mapApiError(new AxiosError('Network Error'))).toBe('network_error')
    const tooLarge = new AxiosError('Large', 'ERR_BAD_RESPONSE', undefined, undefined, {
      data: {}, status: 413, statusText: 'Payload Too Large', headers: {}, config: {} as never,
    })
    expect(mapApiError(tooLarge)).toBe('too_large')
  })

  it.each([502, 503, 504])('explains an unavailable backend (%s)', (status) => {
    const unavailable = new AxiosError('Unavailable', 'ERR_BAD_RESPONSE', undefined, undefined, {
      data: {}, status, statusText: 'Unavailable', headers: {}, config: {} as never,
    })
    expect(mapApiError(unavailable)).toBe('server_unavailable')
  })

  it('explains a stopped Railway application without treating it as an interrupted upload', () => {
    const unavailable = new AxiosError('Not Found', 'ERR_BAD_RESPONSE', undefined, undefined, {
      data: { message: 'Application not found' }, status: 404, statusText: 'Not Found', headers: {}, config: {} as never,
    })
    expect(mapApiError(unavailable)).toBe('server_unavailable')
  })

  it('deletes and rejects an upload if an old backend ignores password protection', async () => {
    apiMocks.post.mockResolvedValue({ data: { data: apiData } })
    apiMocks.delete.mockResolvedValue({ data: { data: { ...apiData, status: 'deleted' } } })
    await expect(uploadFile({
      file: new File(['data'], 'photo.jpg', { type: 'image/jpeg' }), expirationMinutes: 60,
      maxDownloads: null, password: 'a long private passphrase', signal: new AbortController().signal, onProgress: vi.fn(),
    })).rejects.toThrow('password_not_supported')
    expect(apiMocks.delete).toHaveBeenCalledWith('/api/v1/uploads/01UPLOAD', { headers: { 'X-Management-Token': 'management' } })
  })

  it('does not claim cleanup succeeded when an old backend rejects deletion', async () => {
    apiMocks.post.mockResolvedValue({ data: { data: apiData } })
    apiMocks.delete.mockRejectedValue(new Error('offline'))
    await expect(uploadFile({
      file: new File(['data'], 'photo.jpg', { type: 'image/jpeg' }), expirationMinutes: 60,
      maxDownloads: null, password: 'a long private passphrase', signal: new AbortController().signal, onProgress: vi.fn(),
    })).rejects.toThrow('password_cleanup_failed')
  })

  it('keeps management tokens in request headers for status and deletion', async () => {
    apiMocks.get.mockResolvedValue({ data: { data: { ...apiData, file_exists: true } } })
    apiMocks.delete.mockResolvedValue({ data: { data: { ...apiData, status: 'deleted', file_exists: false } } })
    await fetchUploadStatus('01UPLOAD', 'management')
    await deleteRemoteUpload('01UPLOAD', 'management')
    expect(apiMocks.get).toHaveBeenCalledWith('/api/v1/uploads/01UPLOAD', { headers: { 'X-Management-Token': 'management' } })
    expect(apiMocks.delete).toHaveBeenCalledWith('/api/v1/uploads/01UPLOAD', { headers: { 'X-Management-Token': 'management' } })
  })
})

