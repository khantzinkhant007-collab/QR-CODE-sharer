export type UploadStatus = 'active' | 'expired' | 'deleted' | 'failed'

export interface UploadRecord {
  passwordProtected?: boolean
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
  password_protected?: boolean
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
  password_protected?: boolean
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

export interface CollectionRecord {
  id: string
  token: string
  title: string
  shareUrl: string
  managementToken: string
  expiresAt: string
  createdAt: string
}

export interface CollectionData {
  id: string
  title: string
  description: string | null
  expires_at: string
  status: 'active' | 'expired' | 'closed'
  file_count: number
  total_bytes: number
  max_files: number
  max_total_bytes: number
  max_file_bytes: number
  share_url: string
}

export interface CollectionFileData {
  id: string
  original_name: string
  mime_type: string
  size_bytes: number
  created_at: string
  download_url: string
  preview_url: string | null
}

export interface CollectionResponse {
  data: CollectionData
  files: { data: CollectionFileData[]; current_page: number; last_page: number; total: number }
}

