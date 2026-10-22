import { CircleHelp, Clock3, Home, ShieldCheck, UsersRound } from 'lucide-react'
import { useLayoutEffect, useRef } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useI18n } from '../i18n'

const navigation = [
  { to: '/', key: 'nav.home', icon: Home },
  { to: '/events', key: 'nav.events', icon: UsersRound },
  { to: '/history', key: 'nav.history', icon: Clock3 },
  { to: '/privacy', key: 'nav.privacy', icon: ShieldCheck },
  { to: '/help', key: 'nav.help', icon: CircleHelp },
]

export function Navigation({ mobile = false }: { mobile?: boolean }) {
  const { pathname } = useLocation()
  const { locale, t } = useI18n()
  const navigationRef = useRef<HTMLElement>(null)
  const indicatorRef = useRef<HTMLSpanElement>(null)

  useLayoutEffect(() => {
    const nav = navigationRef.current
    const indicator = indicatorRef.current
    if (!nav || !indicator) return

    let frame = 0
    const positionIndicator = () => {
      const activeLink = nav.querySelector<HTMLElement>('[aria-current="page"]')
      if (!activeLink || nav.getClientRects().length === 0) {
        nav.removeAttribute('data-indicator-ready')
        return
      }

      // Measure the actual label width, including Japanese text and mobile spacing.
      const { offsetLeft, offsetTop, offsetWidth, offsetHeight } = activeLink
      indicator.style.transform = `translate3d(${offsetLeft}px, ${offsetTop}px, 0)`
      indicator.style.width = `${offsetWidth}px`
      indicator.style.height = `${offsetHeight}px`
      nav.setAttribute('data-indicator-ready', '')

      if (!nav.hasAttribute('data-indicator-animate')) {
        cancelAnimationFrame(frame)
        frame = requestAnimationFrame(() => nav.setAttribute('data-indicator-animate', ''))
      }
    }

    positionIndicator()
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(positionIndicator)
    observer?.observe(nav)
    nav.querySelectorAll('.nav-item').forEach((link) => observer?.observe(link))
    window.addEventListener('resize', positionIndicator)

    return () => {
      cancelAnimationFrame(frame)
      observer?.disconnect()
      window.removeEventListener('resize', positionIndicator)
    }
  }, [pathname, locale])

  return (
    <nav ref={navigationRef} className={mobile ? 'liquid-dock' : 'desktop-navigation'} aria-label={t('common.primaryNav')}>
      <span ref={indicatorRef} className="nav-indicator" aria-hidden="true" />
      {navigation.map(({ to, key, icon: Icon }) => (
        <NavLink key={to} to={to} end={to === '/'} viewTransition className="nav-item">
          <Icon size={mobile ? 20 : 16} strokeWidth={mobile ? 1.7 : 1.8} />{t(key)}
        </NavLink>
      ))}
    </nav>
  )
}
