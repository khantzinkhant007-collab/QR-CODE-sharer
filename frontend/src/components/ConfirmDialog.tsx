import { CircleAlert, File, LoaderCircle } from 'lucide-react'
import { useEffect, useId, useRef } from 'react'
import { useI18n } from '../i18n'

export function ConfirmDialog({ title, message, confirmLabel, busy, onConfirm, onCancel, fileName, error }: {
  title: string; message: string; confirmLabel: string; busy: boolean; onConfirm: () => void; onCancel: () => void; fileName?: string; error?: string | null
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const messageId = useId()
  const { t } = useI18n()
  useEffect(() => {
    const element = dialog.current
    element?.showModal()
    return () => element?.close()
  }, [])
  return <dialog ref={dialog} onCancel={(event) => { event.preventDefault(); if (!busy) onCancel() }} aria-labelledby={titleId} aria-describedby={messageId} aria-busy={busy} className="glass-panel confirm-dialog fixed inset-0 m-auto w-[calc(100%_-_2rem)] max-w-md text-slate-900 dark:text-white">
    <span className="confirm-dialog-icon" aria-hidden="true"><CircleAlert size={26} strokeWidth={1.6} /></span>
    <h2 id={titleId} className="text-xl font-semibold tracking-tight">{title}</h2>
    <p id={messageId} className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">{message}</p>
    {fileName && <p className="glass-inset mt-5 flex items-start gap-3 rounded-2xl p-3 text-sm"><File size={18} className="mt-0.5 shrink-0 text-slate-500" aria-hidden="true" /><span className="min-w-0 break-all font-medium">{fileName}</span></p>}
    {error && <p role="alert" className="error-box mt-4">{error}</p>}
    <div className="confirm-dialog-actions mt-7"><button autoFocus type="button" className="secondary-button" onClick={onCancel} disabled={busy}>{t('collection.cancel')}</button><button type="button" className="danger-button" onClick={onConfirm} disabled={busy}>{busy && <LoaderCircle className="animate-spin" size={17} aria-hidden="true" />}{confirmLabel}</button></div>
  </dialog>
}
