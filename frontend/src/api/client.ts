import axios from 'axios'
import { resolveApiBaseUrl } from '../lib/apiBaseUrl'

export const api = axios.create({
  baseURL: resolveApiBaseUrl(import.meta.env.VITE_API_BASE_URL, import.meta.env.PROD),
  headers: { Accept: 'application/json' },
  timeout: 0,
})
