import { FileArchive, FileImage, FileText, Film, Plus, Replace, Trash2, X } from 'lucide-react'
import { useI18n } from '../i18n'
import { formatBytes, previewKind } from '../lib/files'

export function FilePreview({
  file,
  files,
  url,
  onRemove,
  onChange,
  onAddFiles,
  onRemoveFile,
}: {
  file: File
  files?: File[]
  url: string
  onRemove: () => void
  onChange: () => void
  onAddFiles?: () => void
  onRemoveFile?: (index: number) => void
}) {
  const { t } = useI18n()
  const list = files && files.length > 0 ? files : [file]
  const isBundle = list.length > 1
  const totalBytes = list.reduce((sum, item) => sum + item.size, 0)
  const bundleName = `scansend-${list.length}-files.zip`
  const kind = previewKind(file.type)

  if (isBundle) {
    return <section className="glass-panel overflow-hidden rounded-3xl">
      <div className="grid gap-0 md:grid-cols-[1.15fr_.85fr]">
        <div className="flex min-h-64 flex-col justify-between bg-slate-950 p-6 text-slate-100">
          <div className="mb-4 flex items-center gap-3">
            <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-teal-500/20 text-teal-200"><FileArchive size={26} /></span>
            <div className="min-w-0">
              <p className="font-black text-white">{t('file.bundleTitle', { count: list.length })}</p>
              <p className="text-xs text-slate-300">{t('file.bundleHint', { name: bundleName })}</p>
            </div>
          </div>
          <ul className="max-h-64 space-y-2 overflow-y-auto pr-1" aria-label={t('file.bundleTitle', { count: list.length })}>
            {list.map((item, index) => {
              const itemKind = previewKind(item.type)
              return <li key={`${item.name}-${item.size}-${index}`} className="flex items-center justify-between gap-3 rounded-2xl bg-white/10 px-3.5 py-2.5 text-sm">
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className="shrink-0 text-teal-300">{itemKind === 'video' ? <Film size={16} /> : itemKind === 'image' ? <FileImage size={16} /> : <FileText size={16} />}</span>
                  <span className="truncate font-semibold text-white">{item.name}</span>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-xs text-slate-300">{formatBytes(item.size)}</span>
                  {onRemoveFile && <button type="button" onClick={() => onRemoveFile(index)} className="rounded-lg p-1 text-slate-300 transition hover:bg-white/15 hover:text-white" aria-label={t('file.removeOne', { name: item.name })}><X size={15} /></button>}
                </div>
              </li>
            })}
          </ul>
        </div>
        <div className="flex flex-col p-6">
          <div className="mb-5 flex min-w-0 items-center gap-3"><span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-200"><FileArchive /></span><div className="min-w-0"><p className="truncate font-black">{bundleName}</p><p className="text-sm text-slate-500">{formatBytes(totalBytes)}</p></div></div>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between gap-4"><dt className="text-slate-500">{t('file.name')}</dt><dd className="max-w-[60%] break-all text-right font-semibold">{bundleName}</dd></div>
            <div className="flex justify-between gap-4"><dt className="shrink-0 text-slate-500">{t('file.type')}</dt><dd className="min-w-0 break-all text-right font-semibold">{t('file.bundleType', { count: list.length })}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-slate-500">{t('file.totalSize')}</dt><dd className="font-semibold">{formatBytes(totalBytes)}</dd></div>
          </dl>
          <div className="mt-auto flex flex-wrap gap-2 pt-6">
            {onAddFiles && <button type="button" className="secondary-button flex-1" onClick={onAddFiles}><Plus size={18} />{t('file.addMore')}</button>}
            <button type="button" className="secondary-button flex-1" onClick={onChange}><Replace size={18} />{t('file.change')}</button>
            <button type="button" className="danger-icon" onClick={onRemove} aria-label={t('file.clearAll')}><Trash2 size={18} /></button>
          </div>
        </div>
      </div>
    </section>
  }

  return <section className="glass-panel overflow-hidden rounded-3xl">
    <div className="grid gap-0 md:grid-cols-[1.15fr_.85fr]">
      <div className="grid min-h-64 place-items-center bg-slate-950">
        {kind === 'image' && <img src={url} alt={t('common.imagePreview')} className="max-h-[440px] size-full object-contain" />}
        {kind === 'video' && <video src={url} controls preload="metadata" className="max-h-[440px] size-full object-contain" aria-label={t('common.videoPreview')} />}
        {kind === 'unknown' && <div className="max-w-sm p-8 text-center text-slate-200"><FileText size={64} strokeWidth={1.2} className="mx-auto mb-5 text-blue-200" aria-hidden="true" /><p className="break-all font-semibold">{file.name}</p><p className="mt-3 text-sm leading-6 text-slate-300">{t('file.attachmentPreview')}</p></div>}
      </div>
      <div className="flex flex-col p-6">
        <div className="mb-5 flex min-w-0 items-center gap-3"><span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-200">{kind === 'video' ? <Film /> : kind === 'image' ? <FileImage /> : <FileText />}</span><div className="min-w-0"><p className="truncate font-black">{file.name}</p><p className="text-sm text-slate-500">{formatBytes(file.size)}</p></div></div>
        <dl className="space-y-3 text-sm">
          <div className="flex justify-between gap-4"><dt className="text-slate-500">{t('file.name')}</dt><dd className="max-w-[60%] break-all text-right font-semibold">{file.name}</dd></div>
          <div className="flex justify-between gap-4"><dt className="shrink-0 text-slate-500">{t('file.type')}</dt><dd className="min-w-0 break-all text-right font-semibold">{file.type || 'application/octet-stream'}</dd></div>
          <div className="flex justify-between gap-4"><dt className="text-slate-500">{t('file.size')}</dt><dd className="font-semibold">{formatBytes(file.size)}</dd></div>
        </dl>
        <div className="mt-auto flex flex-wrap gap-2 pt-6">
          {onAddFiles && <button type="button" className="secondary-button flex-1" onClick={onAddFiles}><Plus size={18} />{t('file.addMore')}</button>}
          <button type="button" className="secondary-button flex-1" onClick={onChange}><Replace size={18} />{t('file.change')}</button>
          <button type="button" className="danger-icon" onClick={onRemove} aria-label={t('file.change')}><Trash2 size={18} /></button>
        </div>
      </div>
    </div>
  </section>
}
