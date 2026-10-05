import { RefreshCw, X } from 'lucide-react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { useI18n } from '../i18n'

export function PwaUpdatePrompt() {
  const { t } = useI18n()
  const { needRefresh: [needRefresh, setNeedRefresh], updateServiceWorker } = useRegisterSW()
  if (!needRefresh) return null

  return <div role="status" className="glass-feature fixed bottom-24 left-1/2 z-50 flex w-[min(92vw,520px)] -translate-x-1/2 items-center gap-3 rounded-2xl p-4 text-white md:bottom-6">
    <RefreshCw className="shrink-0 text-teal-300" />
    <p className="flex-1 text-sm font-semibold">{t('pwa.update')}</p>
    <button type="button" className="rounded-xl bg-teal-500 px-3 py-2 text-sm font-bold text-slate-950" onClick={() => void updateServiceWorker(true)}>{t('pwa.reload')}</button>
    <button type="button" className="rounded-xl p-2 hover:bg-white/10" onClick={() => setNeedRefresh(false)} aria-label={t('pwa.close')}><X size={18} /></button>
  </div>
}

