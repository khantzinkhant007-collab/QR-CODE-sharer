import type { UploadStatus } from '../types'
import { useI18n } from '../i18n'

export function StatusBadge({ status }: { status: UploadStatus }) {
  const { t } = useI18n()
  const styles: Record<UploadStatus, string> = {
    active: 'bg-emerald-400/15 text-emerald-200',
    expired: 'bg-amber-400/15 text-amber-200',
    deleted: 'bg-slate-300/15 text-slate-300',
    failed: 'bg-rose-400/15 text-rose-200',
  }
  return <span className={`inline-flex rounded-full border border-white/15 px-2.5 py-1 text-xs font-black uppercase tracking-wide backdrop-blur-sm ${styles[status]}`}>{t(`common.${status}`)}</span>
}

