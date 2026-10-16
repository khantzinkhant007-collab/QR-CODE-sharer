import type { AxiosProgressEvent } from 'axios'
import { api } from './client'
import type { CollectionData, CollectionFileData, CollectionRecord, CollectionResponse } from '../types'

const path = (token: string) => `/api/v1/collections/${encodeURIComponent(token)}`

export async function createCollection(values: { title: string; description: string; expires_at: string }): Promise<CollectionRecord> {
  const response = await api.post<{ data: CollectionData & { token: string; management_token: string } }>('/api/v1/collections', values)
  const data = response.data.data
  return { id: data.id, token: data.token, title: data.title, shareUrl: data.share_url, managementToken: data.management_token, expiresAt: data.expires_at, createdAt: new Date().toISOString() }
}

export async function fetchCollection(token: string, page = 1): Promise<CollectionResponse> {
  const response = await api.get<CollectionResponse>(path(token), { params: { page } })
  return response.data
}

export async function uploadCollectionFile(token: string, file: File, signal: AbortSignal, onUploadProgress: (event: AxiosProgressEvent) => void): Promise<CollectionFileData> {
  const body = new FormData()
  body.append('file', file, file.name)
  const response = await api.post<{ data: CollectionFileData }>(`${path(token)}/files`, body, { signal, onUploadProgress })
  return response.data.data
}

export async function updateCollectionExpiry(token: string, managementToken: string, expires_at: string): Promise<CollectionData> {
  const response = await api.patch<{ data: CollectionData }>(path(token), { expires_at }, { headers: { 'X-Management-Token': managementToken } })
  return response.data.data
}

export async function closeCollection(token: string, managementToken: string): Promise<void> {
  await api.delete(path(token), { headers: { 'X-Management-Token': managementToken } })
}

export async function removeCollectionFile(token: string, fileId: string, managementToken: string): Promise<void> {
  await api.delete(`${path(token)}/files/${encodeURIComponent(fileId)}`, { headers: { 'X-Management-Token': managementToken } })
}
