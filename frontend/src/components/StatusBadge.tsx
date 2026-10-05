import type { UploadStatus } from '../types'
import { useI18n } from '../i18n'

export function StatusBadge({ status }: { status: UploadStatus }) {
  const { t } = useI18n()
  const styles: Record<UploadStatus, string> = {
    active: 'bg-emerald-100/70 text-emerald-800 dark:bg-emerald-400/15 dark:text-emerald-200',
    expired: 'bg-amber-100/70 text-amber-900 dark:bg-amber-400/15 dark:text-amber-200',
    deleted: 'bg-slate-200/70 text-slate-700 dark:bg-slate-300/15 dark:text-slate-300',
    failed: 'bg-rose-100/70 text-rose-800 dark:bg-rose-400/15 dark:text-rose-200',
  }
  return <span className={`inline-flex rounded-full border border-white/55 px-2.5 py-1 text-xs font-black uppercase tracking-wide backdrop-blur-sm dark:border-white/10 ${styles[status]}`}>{t(`common.${status}`)}</span>
}

