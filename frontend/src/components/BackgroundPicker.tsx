import { Check, Image, X } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { useI18n } from '../i18n'
import { backgrounds, type BackgroundId } from '../lib/backgrounds'

function BackgroundDialog({ value, onChange, onClose, saved }: {
  value: BackgroundId; onChange: (value: BackgroundId) => void; onClose: () => void; saved: boolean
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const descriptionId = useId()
  const groupName = useId()
  const { t } = useI18n()

  useEffect(() => {
    const element = dialog.current
    element?.showModal()
    return () => element?.close()
  }, [])

  return <dialog ref={dialog} onCancel={(event) => { event.preventDefault(); onClose() }} aria-labelledby={titleId} aria-describedby={descriptionId} className="glass-panel confirm-dialog background-dialog fixed inset-0 m-auto text-slate-900 dark:text-white">
    <div className="flex items-start justify-between gap-4">
      <div><p className="section-kicker"><Image size={15} aria-hidden="true" />{t('backgrounds.eyebrow')}</p><h2 id={titleId} className="text-2xl font-semibold tracking-tight">{t('backgrounds.title')}</h2></div>
      <button autoFocus type="button" className="icon-button" onClick={onClose} aria-label={t('common.close')}><X size={20} /></button>
    </div>
    <p id={descriptionId} className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">{t('backgrounds.description')}</p>
    <fieldset className="mt-6 grid grid-cols-2 gap-3 border-0 p-0">
      <legend className="sr-only">{t('backgrounds.title')}</legend>
      {backgrounds.map((background) => <label key={background.id} className="background-choice">
        <input type="radio" name={groupName} value={background.id} checked={value === background.id} onChange={() => onChange(background.id)} className="sr-only" />
        <span className="background-card">
          <img src={background.thumbnail} alt="" width={400} height={225} className="background-thumbnail" />
          <span className="background-card-caption"><span>{t(`backgrounds.${background.id}`)}</span><span className="background-check" aria-hidden="true">{value === background.id && <Check size={14} />}</span></span>
        </span>
      </label>)}
    </fieldset>
    <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
      <p role="status" className="max-w-xs text-xs leading-5 text-slate-500">{t(saved ? 'backgrounds.saved' : 'backgrounds.sessionOnly')}</p>
      <button type="button" className="primary-button" onClick={onClose}>{t('backgrounds.done')}</button>
    </div>
  </dialog>
}

export function BackgroundPicker({ value, onChange, saved }: { value: BackgroundId; onChange: (value: BackgroundId) => void; saved: boolean }) {
  const [open, setOpen] = useState(false)
  const { t } = useI18n()
  return <>
    <button type="button" className="icon-button" onClick={() => setOpen(true)} aria-label={t('backgrounds.open')} title={t('backgrounds.open')} aria-haspopup="dialog" aria-expanded={open}><Image size={18} /></button>
    {open && <BackgroundDialog value={value} onChange={onChange} saved={saved} onClose={() => setOpen(false)} />}
  </>
}
