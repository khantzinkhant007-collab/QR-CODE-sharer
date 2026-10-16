export function localDateTime(value: Date): string {
  const adjusted = new Date(value.getTime() - value.getTimezoneOffset() * 60_000)
  return adjusted.toISOString().slice(0, 16)
}

export function collectionDeadline(value: string, now = Date.now()): string {
  const parsed = new Date(value)
  if (!Number.isFinite(parsed.getTime()) || parsed.getTime() <= now) throw new Error('collection.invalidDeadline')
  return parsed.toISOString()
}
