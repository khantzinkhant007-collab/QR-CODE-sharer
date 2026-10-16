import { useEffect, useRef } from 'react'
import { useI18n } from '../i18n'

export function ConfirmDialog({ title, message, confirmLabel, busy, onConfirm, onCancel }: {
  title: string; message: string; confirmLabel: string; busy: boolean; onConfirm: () => void; onCancel: () => void
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const { t } = useI18n()
  useEffect(() => {
    const element = dialog.current
    element?.showModal()
    return () => element?.close()
  }, [])
  return <dialog ref={dialog} onCancel={(event) => { event.preventDefault(); if (!busy) onCancel() }} aria-labelledby="collection-confirm-title" className="glass-panel fixed inset-0 m-auto w-[calc(100%_-_2rem)] max-w-md rounded-3xl p-7 text-slate-900 shadow-2xl backdrop:bg-slate-950/60 backdrop:backdrop-blur-sm dark:text-white">
    <h2 id="collection-confirm-title" className="text-xl font-black">{title}</h2>
    <p className="mb-6 mt-3 text-sm leading-6">{message}</p>
    <div className="flex flex-wrap justify-end gap-3"><button autoFocus type="button" className="secondary-button" onClick={onCancel} disabled={busy}>{t('collection.cancel')}</button><button type="button" className="danger-button" onClick={onConfirm} disabled={busy}>{confirmLabel}</button></div>
  </dialog>
}
