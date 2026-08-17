import { CircleHelp, Clock3, Home, Languages, Moon, QrCode, ShieldCheck, Sun } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { useOnlineStatus } from '../hooks/useOnlineStatus'
import { useI18n } from '../i18n'
import { PwaUpdatePrompt } from './PwaUpdatePrompt'

const navigation = [
  { to: '/', key: 'nav.home', icon: Home },
  { to: '/history', key: 'nav.history', icon: Clock3 },
  { to: '/privacy', key: 'nav.privacy', icon: ShieldCheck },
  { to: '/help', key: 'nav.help', icon: CircleHelp },
]

export function Layout({ children }: { children: ReactNode }) {
  const online = useOnlineStatus()
  const { locale, setLocale, t } = useI18n()
  const [dark, setDark] = useState(() => window.matchMedia('(prefers-color-scheme: dark)').matches)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    document.documentElement.lang = locale
  }, [dark, locale])

  return (
    <div className="min-h-dvh bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <a href="#main" className="sr-only z-50 rounded-lg bg-white p-3 focus:not-sr-only focus:fixed focus:left-3 focus:top-3">{t('common.skip')}</a>
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-slate-50/85 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/85">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <NavLink to="/" className="group flex items-center gap-3 rounded-xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-teal-300/50">
            <span className="grid size-10 place-items-center rounded-2xl bg-teal-700 text-white shadow-lg shadow-teal-700/20 group-hover:rotate-3"><QrCode size={22} /></span>
            <span><strong className="block text-lg leading-none tracking-tight">ScanSend</strong><small className="text-xs text-slate-500 dark:text-slate-400">{t('brand.tagline')}</small></span>
          </NavLink>
          <nav className="hidden items-center gap-1 md:flex" aria-label={t('common.primaryNav')}>
            {navigation.map(({ to, key, icon: Icon }) => <NavLink key={to} to={to} className={({ isActive }) => `flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-semibold transition ${isActive ? 'bg-teal-100 text-teal-900 dark:bg-teal-900/50 dark:text-teal-100' : 'text-slate-600 hover:bg-white dark:text-slate-300 dark:hover:bg-slate-900'}`}><Icon size={17} />{t(key)}</NavLink>)}
          </nav>
          <div className="flex items-center gap-2">
            <span className={`hidden items-center gap-2 rounded-full px-3 py-2 text-xs font-bold sm:flex ${online ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200' : 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200'}`}><span className={`size-2 rounded-full ${online ? 'bg-emerald-500' : 'bg-amber-500'}`} />{online ? t('status.online') : t('status.offline')}</span>
            <button type="button" className="icon-button" onClick={() => setLocale(locale === 'en' ? 'ja' : 'en')} aria-label={t('common.language')}><Languages size={19} /><span className="text-[10px] font-black uppercase">{locale}</span></button>
            <button type="button" className="icon-button" onClick={() => setDark((value) => !value)} aria-label={t('common.theme')}>{dark ? <Sun size={19} /> : <Moon size={19} />}</button>
          </div>
        </div>
      </header>
      <main id="main" className="mx-auto max-w-6xl px-4 pb-28 pt-7 sm:px-6 md:pb-12">{children}</main>
      <nav className="fixed inset-x-3 bottom-3 z-40 grid grid-cols-4 rounded-2xl border border-slate-200 bg-white/95 p-1.5 shadow-2xl backdrop-blur-xl dark:border-slate-700 dark:bg-slate-900/95 md:hidden" aria-label={t('common.primaryNav')}>
        {navigation.map(({ to, key, icon: Icon }) => <NavLink key={to} to={to} className={({ isActive }) => `flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-bold ${isActive ? 'bg-teal-100 text-teal-900 dark:bg-teal-900/60 dark:text-teal-100' : 'text-slate-500 dark:text-slate-400'}`}><Icon size={19} />{t(key)}</NavLink>)}
      </nav>
      <PwaUpdatePrompt />
    </div>
  )
}
