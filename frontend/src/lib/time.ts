export interface CountdownParts {
  expired: boolean
  label: string
}

export function expirationCountdown(expiresAt: string, now = Date.now()): CountdownParts {
  const remaining = new Date(expiresAt).getTime() - now
  if (remaining <= 0) return { expired: true, label: '0m' }
  const totalSeconds = Math.ceil(remaining / 1000)
  const days = Math.floor(totalSeconds / 86400)
  const hours = Math.floor((totalSeconds % 86400) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  if (days > 0) return { expired: false, label: `${days}d ${hours}h` }
  if (hours > 0) return { expired: false, label: `${hours}h ${minutes}m` }
  return { expired: false, label: `${minutes}m ${seconds}s` }
}

