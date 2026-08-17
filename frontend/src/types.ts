export type UploadStatus = 'active' | 'expired' | 'deleted' | 'failed'

export interface UploadRecord {
  id: string
  originalName: string
  mimeType: string
  sizeBytes: number
  downloadUrl: string
  expiresAt: string
  maxDownloads: number | null
  downloadCount: number
  managementToken: string
  createdAt: string
  localStatus: UploadStatus
}

export interface UploadApiData {
  id: string
  original_name: string
  mime_type: string
  size_bytes: number
  download_url: string
  expires_at: string
  max_downloads: number | null
  download_count: number
  management_token: string
  status: UploadStatus
}

export interface UploadStatusData {
  id: string
  original_name: string
  mime_type: string
  size_bytes: number
  expires_at: string
  max_downloads: number | null
  download_count: number
  status: UploadStatus
  file_exists: boolean
}

export interface UploadProgress {
  loaded: number
  total: number
  percent: number
  bytesPerSecond: number
  etaSeconds: number | null
}

