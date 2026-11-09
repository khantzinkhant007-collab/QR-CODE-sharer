import { Languages, Moon, QrCode, Sun } from 'lucide-react'
import { useLayoutEffect, useState, type CSSProperties, type ReactNode } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useOnlineStatus } from '../hooks/useOnlineStatus'
import { useI18n } from '../i18n'
import { PwaUpdatePrompt } from './PwaUpdatePrompt'
import { Navigation } from './Navigation'
import { BackgroundPicker } from './BackgroundPicker'
import { backgrounds, readBackground, saveBackground, type BackgroundId } from '../lib/backgrounds'

export function Layout({ children }: { children: ReactNode }) {
  const { pathname } = useLocation()
  const online = useOnlineStatus()
  const { locale, setLocale, t } = useI18n()
  const [background, setBackground] = useState(readBackground)
  const [backgroundSaved, setBackgroundSaved] = useState(true)
  const changeBackground = (value: BackgroundId) => {
    setBackground(value)
    setBackgroundSaved(saveBackground(value))
  }
  const wallpaper = backgrounds.find((option) => option.id === background) ?? backgrounds[0]
  const [dark, setDark] = useState(() => {
    let savedTheme: string | null = null
    try { savedTheme = window.localStorage.getItem('scansend-theme') } catch { /* Private browsing may block storage. */ }
    return savedTheme ? savedTheme === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches
  })

  useLayoutEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    document.documentElement.lang = locale
    try { window.localStorage.setItem('scansend-theme', dark ? 'dark' : 'light') } catch { /* Keep session controls working without storage. */ }
  }, [dark, locale])

  return (
    <div className="app-shell min-h-dvh text-slate-900 dark:text-slate-100" data-background={background} style={{ '--app-wallpaper': `url("${wallpaper.image}")` } as CSSProperties}>
      <a href="#main" className="sr-only z-50 rounded-lg bg-white p-3 focus:not-sr-only focus:fixed focus:left-3 focus:top-3">{t('common.skip')}</a>
      <header className="app-header">
        <div className="glass-header header-inner">
          <NavLink to="/" className="brand-link">
            <span className="brand-symbol"><QrCode size={21} strokeWidth={1.8} /></span>
            <span><strong className="brand-name">ScanSend</strong><small className="brand-caption">{t('brand.tagline')}</small></span>
          </NavLink>
          <Navigation />
          <div className="flex shrink-0 items-center gap-1">
            <span className={`status-pill ${online ? '' : 'offline'}`}><span />{online ? t('status.online') : t('status.offline')}</span>
            <BackgroundPicker value={background} onChange={changeBackground} saved={backgroundSaved} />
            <button type="button" className="icon-button" onClick={() => setLocale(locale === 'en' ? 'ja' : 'en')} aria-label={t('common.language')}><Languages size={18} /><span className="text-[9px] font-semibold uppercase">{locale}</span></button>
            <button type="button" className="icon-button" onClick={() => setDark((value) => !value)} aria-label={t('common.theme')} aria-pressed={dark}>{dark ? <Sun size={18} /> : <Moon size={18} />}</button>
          </div>
        </div>
      </header>
      <main id="main" className="app-main">
        <div key={pathname} className="route-content">{children}</div>
      </main>
      <Navigation mobile />
      <PwaUpdatePrompt />
    </div>
  )
}
