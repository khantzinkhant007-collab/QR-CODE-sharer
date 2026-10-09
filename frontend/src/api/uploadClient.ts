import axios, { AxiosError, type AxiosProgressEvent } from 'axios'
import type { UploadApiData, UploadProgress, UploadRecord, UploadStatusData } from '../types'
import { resolveApiBaseUrl } from '../lib/apiBaseUrl'

const api = axios.create({
  baseURL: resolveApiBaseUrl(import.meta.env.VITE_API_BASE_URL, import.meta.env.PROD),
  headers: { Accept: 'application/json' },
  timeout: 0,
})

export class UploadCancelledError extends Error {
  constructor() {
    super('Upload cancelled.')
    this.name = 'UploadCancelledError'
  }
}

export function calculateUploadProgress(
  event: Pick<AxiosProgressEvent, 'loaded' | 'total'>,
  fileSize: number,
  startedAt: number,
  now = performance.now(),
): UploadProgress {
  const total = event.total ?? fileSize
  const elapsedSeconds = Math.max((now - startedAt) / 1000, 0.001)
  const bytesPerSecond = event.loaded / elapsedSeconds
  const remaining = Math.max(total - event.loaded, 0)

  return {
    loaded: event.loaded,
    total,
    percent: total > 0 ? Math.min(100, Math.round((event.loaded / total) * 100)) : 0,
    bytesPerSecond,
    etaSeconds: bytesPerSecond > 0 && remaining > 0 ? remaining / bytesPerSecond : null,
  }
}

export function mapApiError(error: unknown): string {
  if (axios.isCancel(error)) return 'cancelled'
  if (error instanceof AxiosError) {
    if (!error.response) return navigator.onLine ? 'network_error' : 'offline'
    if (error.response.status === 413) return 'too_large'
    if (error.response.status === 429) return 'rate_limited'
    if ([502, 503, 504].includes(error.response.status)) return 'server_unavailable'
    const responseData = error.response.data as { message?: string; errors?: Record<string, string[]> }
    if (error.response.status === 404 && responseData?.message === 'Application not found') return 'server_unavailable'
    return responseData.errors?.file?.[0] ?? responseData.message ?? 'upload_failed'
  }
  return error instanceof Error ? error.message : 'upload_failed'
}

export async function uploadFile(options: {
  file: File
  expirationMinutes: number
  maxDownloads: number | null
  password?: string
  signal: AbortSignal
  onProgress: (progress: UploadProgress) => void
}): Promise<UploadRecord> {
  const formData = new FormData()
  formData.append('file', options.file, options.file.name)
  formData.append('expires_in_minutes', String(options.expirationMinutes))
  if (options.maxDownloads !== null) formData.append('max_downloads', String(options.maxDownloads))
  if (options.password) formData.append('password', options.password)
  const startedAt = performance.now()

  try {
    const response = await api.post<{ data: UploadApiData }>('/api/v1/uploads', formData, {
      signal: options.signal,
      onUploadProgress: (event) => options.onProgress(
        calculateUploadProgress(event, options.file.size, startedAt),
      ),
    })
    const data = response.data.data
    // Never present a protected QR if an older backend silently ignored the password.
    if (options.password && data.password_protected !== true) {
      try {
        await deleteRemoteUpload(data.id, data.management_token)
      } catch {
        throw new Error('password_cleanup_failed')
      }
      throw new Error('password_not_supported')
    }
    return {
      id: data.id,
      originalName: data.original_name,
      mimeType: data.mime_type,
      sizeBytes: data.size_bytes,
      downloadUrl: data.download_url,
      expiresAt: data.expires_at,
      maxDownloads: data.max_downloads,
      downloadCount: data.download_count,
      managementToken: data.management_token,
      createdAt: new Date().toISOString(),
      localStatus: data.status,
      passwordProtected: data.password_protected ?? false,
    }
  } catch (error) {
    if (axios.isCancel(error)) throw new UploadCancelledError()
    throw new Error(mapApiError(error), { cause: error })
  }
}

export async function fetchUploadStatus(id: string, managementToken: string): Promise<UploadStatusData> {
  const response = await api.get<{ data: UploadStatusData }>(`/api/v1/uploads/${encodeURIComponent(id)}`, {
    headers: { 'X-Management-Token': managementToken },
  })
  return response.data.data
}

export async function deleteRemoteUpload(id: string, managementToken: string): Promise<UploadStatusData> {
  const response = await api.delete<{ data: UploadStatusData }>(`/api/v1/uploads/${encodeURIComponent(id)}`, {
    headers: { 'X-Management-Token': managementToken },
  })
  return response.data.data
}

