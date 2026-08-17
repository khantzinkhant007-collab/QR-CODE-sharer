import { useEffect, useState } from 'react'
import { expirationCountdown } from '../lib/time'

export function useCountdown(expiresAt: string) {
  const [countdown, setCountdown] = useState(() => expirationCountdown(expiresAt))

  useEffect(() => {
    setCountdown(expirationCountdown(expiresAt))
    const timer = window.setInterval(() => setCountdown(expirationCountdown(expiresAt)), 1000)
    return () => window.clearInterval(timer)
  }, [expiresAt])

  return countdown
}

