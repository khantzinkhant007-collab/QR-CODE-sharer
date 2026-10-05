import { FileImage, Film, Replace, Trash2 } from 'lucide-react'
import { useI18n } from '../i18n'
import { formatBytes, previewKind } from '../lib/files'

export function FilePreview({ file, url, onRemove, onChange }: { file: File; url: string; onRemove: () => void; onChange: () => void }) {
  const { t } = useI18n()
  const kind = previewKind(file.type)

  return <section className="glass-panel overflow-hidden rounded-3xl">
    <div className="grid gap-0 md:grid-cols-[1.15fr_.85fr]">
      <div className="grid min-h-64 place-items-center bg-slate-950">
        {kind === 'image' && <img src={url} alt={t('common.imagePreview')} className="max-h-[440px] size-full object-contain" />}
        {kind === 'video' && <video src={url} controls preload="metadata" className="max-h-[440px] size-full object-contain" aria-label={t('common.videoPreview')} />}
      </div>
      <div className="flex flex-col p-6">
        <div className="mb-5 flex items-center gap-3"><span className="grid size-12 place-items-center rounded-2xl bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-200">{kind === 'video' ? <Film /> : <FileImage />}</span><div className="min-w-0"><p className="truncate font-black">{file.name}</p><p className="text-sm text-slate-500">{formatBytes(file.size)}</p></div></div>
        <dl className="space-y-3 text-sm">
          <div className="flex justify-between gap-4"><dt className="text-slate-500">{t('file.name')}</dt><dd className="max-w-[60%] break-all text-right font-semibold">{file.name}</dd></div>
          <div className="flex justify-between gap-4"><dt className="text-slate-500">{t('file.type')}</dt><dd className="text-right font-semibold">{file.type || 'application/octet-stream'}</dd></div>
          <div className="flex justify-between gap-4"><dt className="text-slate-500">{t('file.size')}</dt><dd className="font-semibold">{formatBytes(file.size)}</dd></div>
        </dl>
        <div className="mt-auto flex gap-2 pt-6"><button type="button" className="secondary-button flex-1" onClick={onChange}><Replace size={18} />{t('file.change')}</button><button type="button" className="danger-icon" onClick={onRemove} aria-label={t('file.change')}><Trash2 size={18} /></button></div>
      </div>
    </div>
  </section>
}
