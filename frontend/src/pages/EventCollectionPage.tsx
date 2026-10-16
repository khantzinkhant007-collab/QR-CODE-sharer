import { useQuery, useQueryClient } from '@tanstack/react-query'
import { AxiosError, isCancel } from 'axios'
import { CalendarClock, Check, Copy, Download, FolderOpen, ImagePlus, QrCode, RefreshCw, Share2, ShieldCheck, Trash2, UsersRound, X } from 'lucide-react'
import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { Link, useBlocker, useParams } from 'react-router-dom'
import { closeCollection, fetchCollection, removeCollectionFile, updateCollectionExpiry, uploadCollectionFile } from '../api/collectionClient'
import { mapApiError } from '../api/uploadClient'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { useCountdown } from '../hooks/useCountdown'
import { useI18n } from '../i18n'
import { collectionDeadline, localDateTime } from '../lib/collections'
import { formatBytes, validateSelectedFile } from '../lib/files'
import { getCollection, saveCollection } from '../lib/history'
import { generateQrDataUrl } from '../lib/qr'
import { copyText } from '../lib/share'
import type { CollectionFileData } from '../types'

export function EventCollectionPage() {
  const { collectionToken = '' } = useParams()
  return <CollectionView key={collectionToken} collectionToken={collectionToken} />
}

function CollectionView({ collectionToken }: { collectionToken: string }) {
  const { t, locale } = useI18n()
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [files, setFiles] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState({ name: '', percent: 0 })
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [copied, setCopied] = useState(false)
  const [nextDeadline, setNextDeadline] = useState('')
  const [managing, setManaging] = useState(false)
  const [closed, setClosed] = useState(false)
  const [confirmation, setConfirmation] = useState<'close' | CollectionFileData | null>(null)
  const abort = useRef<AbortController | null>(null)
  const input = useRef<HTMLInputElement>(null)
  const owner = useQuery({ queryKey: ['collection-owner', collectionToken], queryFn: () => getCollection(collectionToken) })
  const gallery = useQuery({
    queryKey: ['collection', collectionToken, page], queryFn: () => fetchCollection(collectionToken, page),
    enabled: !closed,
    retry: false,
    refetchInterval: (query) => query.state.error instanceof AxiosError && [404, 410].includes(query.state.error.response?.status ?? 0) ? false : 15_000,
  })
  const collection = gallery.data?.data
  useEffect(() => {
    if (gallery.data && page > gallery.data.files.last_page) setPage(gallery.data.files.last_page)
  }, [gallery.data, page])
  const countdown = useCountdown(collection?.expires_at ?? '2100-01-01T00:00:00.000Z')
  const qr = useQuery({ queryKey: ['collection-qr', collection?.share_url], queryFn: () => generateQrDataUrl(collection!.share_url), enabled: Boolean(collection?.share_url) })
  const blocker = useBlocker(() => uploading)
  useEffect(() => () => abort.current?.abort(), [])
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { if (uploading) { event.preventDefault(); event.returnValue = '' } }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [uploading])
  const message = (value: string) => {
    const translated = t(`upload.${value}`)
    return translated === `upload.${value}` ? t(value) : translated
  }
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['collection', collectionToken] })
  const chooseFiles = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(event.target.files ?? [])
    event.target.value = ''
    if (!collection || selected.length === 0) return
    const invalid = selected.map((file) => validateSelectedFile(file, collection.max_file_bytes)).find(Boolean)
    if (invalid) { setError(invalid === 'too_large' ? t('file.tooLarge', { max: collection.max_file_bytes / 1024 ** 2 }) : t('file.unsupported')); return }
    if (selected.length + collection.file_count > collection.max_files || selected.reduce((total, file) => total + file.size, collection.total_bytes) > collection.max_total_bytes) { setError(t('collection.capacity')); return }
    setFiles(selected)
    setError('')
    setNotice('')
  }
  const upload = async () => {
    if (uploading || files.length === 0) return
    const controller = new AbortController()
    abort.current = controller
    setUploading(true)
    setError('')
    setNotice('')
    let completed = 0
    try {
      for (const file of files) {
        if (controller.signal.aborted) break
        setProgress({ name: file.name, percent: 0 })
        await uploadCollectionFile(collectionToken, file, controller.signal, (event) => {
          setProgress({ name: file.name, percent: Math.min(100, Math.round(event.loaded / ((event.total ?? file.size) || 1) * 100)) })
        })
        completed++
        setFiles((remaining) => remaining.slice(1))
        setPage(1)
        await invalidate()
      }
      if (!controller.signal.aborted) setNotice(t('collection.uploaded', { count: completed }))
    } catch (failure) {
      setError(isCancel(failure) ? t('collection.cancelled') : message(mapApiError(failure)))
    } finally {
      setUploading(false)
      abort.current = null
      await invalidate()
    }
  }
  const copy = async () => {
    try { await copyText(collection!.share_url); setCopied(true) } catch (failure) { setError(mapApiError(failure)) }
  }
  const share = async () => {
    try {
      if (navigator.share) await navigator.share({ title: collection!.title, url: collection!.share_url })
      else await copy()
    } catch (failure) { if (!(failure instanceof DOMException && failure.name === 'AbortError')) setError(mapApiError(failure)) }
  }
  const updateDeadline = async () => {
    if (!owner.data || !collection || managing) return
    setManaging(true)
    setError('')
    try {
      const updated = await updateCollectionExpiry(collectionToken, owner.data.managementToken, collectionDeadline(nextDeadline))
      await saveCollection({ ...owner.data, expiresAt: updated.expires_at })
      await invalidate()
      setNotice(t('collection.deadlineUpdated'))
    } catch (failure) { setError(message(mapApiError(failure))) } finally { setManaging(false) }
  }
  const confirm = async () => {
    if (!owner.data || !confirmation || managing) return
    setManaging(true)
    setError('')
    try {
      if (confirmation === 'close') { await closeCollection(collectionToken, owner.data.managementToken); setClosed(true) }
      else { await removeCollectionFile(collectionToken, confirmation.id, owner.data.managementToken); await invalidate() }
      setConfirmation(null)
    } catch (failure) { setConfirmation(null); setError(message(mapApiError(failure))) } finally { setManaging(false) }
  }
  const expired = Boolean(collection && countdown.expired)
  const gone = gallery.error instanceof AxiosError && [404, 410].includes(gallery.error.response?.status ?? 0)
  if (closed || gone || expired) return <section className="empty-state glass-panel"><CalendarClock size={44} /><h1 className="text-3xl font-black">{t('collection.unavailable')}</h1><p className="max-w-md leading-7">{t('collection.unavailableHint')}</p><Link to="/events" className="primary-button">{t('collection.create')}</Link></section>
  if (!collection) return <section className="glass-panel rounded-3xl p-8"><h1 className="text-2xl font-black">{t('collection.loading')}</h1>{gallery.isError && <div className="mt-5 space-y-4"><p role="alert" className="error-box">{message(mapApiError(gallery.error))}</p><button className="secondary-button" onClick={() => void gallery.refetch()}>{t('common.refresh')}</button></div>}</section>
  const local = new URL(collection.share_url).protocol !== 'https:'
  const atCapacity = collection.file_count >= collection.max_files || collection.total_bytes >= collection.max_total_bytes
  return <div className="space-y-6">
    <header className="glass-hero rounded-3xl p-6 sm:p-8"><p className="section-kicker"><UsersRound size={16} />{t('collection.eyebrow')}</p><h1 className="page-title break-words">{collection.title}</h1>{collection.description && <p className="page-subtitle whitespace-pre-wrap break-words">{collection.description}</p>}<div className="mt-5 flex flex-wrap gap-3 text-sm font-semibold"><span className="glass-soft rounded-full px-4 py-2">{t('collection.fileCount', { count: collection.file_count })}</span><span className="glass-soft rounded-full px-4 py-2">{formatBytes(collection.total_bytes)} / {formatBytes(collection.max_total_bytes)}</span><span className="glass-soft flex items-center gap-2 rounded-full px-4 py-2"><CalendarClock size={16} />{new Date(collection.expires_at).toLocaleString(locale)}</span></div></header>
    <div className="grid items-start gap-6 lg:grid-cols-[1fr_300px]">
      <div className="min-w-0 space-y-6">
        <section className="glass-panel space-y-4 rounded-3xl p-6"><h2 className="flex items-center gap-2 text-xl font-black"><ImagePlus size={22} />{t('collection.addFiles')}</h2><p className="text-sm leading-6 opacity-80">{t('collection.everyoneNotice')}</p><p className="text-xs opacity-70">{t('collection.limits', { count: collection.max_files, size: formatBytes(collection.max_file_bytes) })}</p>
          {atCapacity && <p role="status" className="glass-warning rounded-2xl p-4 text-sm">{t('collection.capacity')}</p>}
          <input ref={input} type="file" multiple accept="image/jpeg,image/png,image/webp,image/heic,image/heif,video/mp4,video/quicktime,video/webm,.heic,.heif,.mov" onChange={chooseFiles} className="sr-only" aria-label={t('collection.choose')} disabled={uploading || atCapacity} />
          <div className="flex flex-wrap gap-3"><button type="button" className="secondary-button" onClick={() => input.current?.click()} disabled={uploading || atCapacity}><ImagePlus size={18} />{t('collection.choose')}</button>{files.length > 0 && !uploading && <button type="button" className="primary-button" onClick={() => void upload()}>{t('collection.uploadFiles', { count: files.length })}</button>}{uploading && <button className="danger-button" onClick={() => abort.current?.abort()}><X size={18} />{t('upload.cancel')}</button>}</div>
          {files.length > 0 && <ul className="max-h-36 space-y-2 overflow-y-auto text-sm">{files.map((file, index) => <li key={`${index}-${file.name}`} className="flex justify-between gap-4"><span className="truncate">{file.name}</span><span className="shrink-0 opacity-70">{formatBytes(file.size)}</span></li>)}</ul>}
          {uploading && <div role="status" aria-live="polite"><p className="mb-2 truncate text-sm">{progress.name} · {progress.percent}%</p><progress className="upload-progress h-3 w-full" max={100} value={progress.percent} aria-label={t('upload.progress', { percent: progress.percent })} /><p className="mt-2 text-xs opacity-75">{t('upload.warning')}</p></div>}
          {error && <p role="alert" className="error-box">{message(error)}</p>}{notice && <p role="status" className="glass-inset rounded-2xl p-4 text-sm font-semibold">{notice}</p>}
        </section>
        <section><div className="mb-4 flex items-center justify-between gap-3"><h2 className="flex items-center gap-2 text-xl font-black"><FolderOpen size={21} />{t('collection.gallery')}</h2><button className="secondary-button" disabled={gallery.isFetching} onClick={() => void gallery.refetch()}><RefreshCw size={16} />{t('common.refresh')}</button></div>
          {gallery.isError && <p role="alert" className="error-box mb-4">{message(mapApiError(gallery.error))}</p>}
          {gallery.data?.files.total === 0 ? <div className="glass-panel grid place-items-center gap-3 rounded-3xl border-dashed p-10 text-center"><ImagePlus size={38} className="opacity-60" /><h3 className="font-black">{t('collection.emptyGallery')}</h3><p className="max-w-sm text-sm leading-6 opacity-75">{t('collection.emptyGalleryHint')}</p></div> : <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{gallery.data?.files.data.map((file) => <article key={file.id} className="glass-panel overflow-hidden rounded-3xl"><div className="glass-inset grid aspect-[4/3] place-items-center overflow-hidden">{file.preview_url ? <img src={file.preview_url} alt={file.original_name} loading="lazy" referrerPolicy="no-referrer" className="size-full object-cover" /> : <FolderOpen size={42} className="opacity-60" />}</div><div className="space-y-3 p-4"><h3 title={file.original_name} className="truncate text-sm font-black">{file.original_name}</h3><p className="text-xs opacity-70">{formatBytes(file.size_bytes)} · {new Date(file.created_at).toLocaleDateString(locale)}</p><a href={file.download_url} referrerPolicy="no-referrer" className="secondary-button w-full" download><Download size={16} />{t('collection.download')}</a>{owner.data && <button className="ghost-button w-full text-xs" disabled={uploading || managing} onClick={() => setConfirmation(file)}><Trash2 size={14} />{t('collection.remove')}</button>}</div></article>)}</div>}
          {(gallery.data?.files.last_page ?? 1) > 1 && <nav aria-label={t('collection.pages')} className="mt-5 flex items-center justify-center gap-3"><button className="secondary-button" disabled={page === 1} onClick={() => setPage((value) => value - 1)}>{t('collection.previous')}</button><span className="text-sm">{page} / {gallery.data?.files.last_page}</span><button className="secondary-button" disabled={page >= (gallery.data?.files.last_page ?? 1)} onClick={() => setPage((value) => value + 1)}>{t('collection.next')}</button></nav>}
        </section>
      </div>
      <aside className="space-y-5">
        <section className="glass-panel rounded-3xl p-5"><h2 className="mb-4 flex items-center gap-2 font-black"><QrCode size={18} />{t('collection.sameQr')}</h2>{qr.data && <img src={qr.data} alt={t('collection.qrAlt')} className="mx-auto w-full max-w-64 rounded-2xl" />}{qr.isError && <p className="error-box">{t('common.error')}</p>}<p className="my-4 break-all rounded-xl bg-white/10 p-3 text-xs">{collection.share_url}</p><div className="grid gap-2"><button className="secondary-button" onClick={() => void copy()}>{copied ? <Check size={16} /> : <Copy size={16} />}{copied ? t('share.copied') : t('share.copy')}</button><button className="secondary-button" onClick={() => void share()}><Share2 size={16} />{t('share.shareLink')}</button>{qr.data && <a className="secondary-button" href={qr.data} download={`scansend-event-${collection.id}.png`}><Download size={16} />{t('share.downloadQr')}</a>}</div><p className="mt-4 text-xs leading-5 opacity-75">{t('collection.qrHint')}</p></section>
        {local && <p className="glass-warning rounded-2xl p-4 text-xs leading-6">{t('share.localWarning')}</p>}
        {owner.data && <section className="glass-panel space-y-4 rounded-3xl p-5"><h2 className="flex items-center gap-2 font-black"><ShieldCheck size={18} />{t('collection.creatorControls')}</h2><p className="text-xs leading-5 opacity-75">{t('collection.ownerNotice')}</p><label className="block text-xs font-bold">{t('collection.deadline')}<input type="datetime-local" value={nextDeadline || localDateTime(new Date(collection.expires_at))} onChange={(event) => setNextDeadline(event.target.value)} className="glass-inset mt-2 min-h-11 w-full rounded-xl px-2 text-sm" /></label><button className="secondary-button w-full" disabled={managing || uploading || !nextDeadline} onClick={() => void updateDeadline()}>{t('collection.saveDeadline')}</button><button className="danger-button w-full" disabled={managing || uploading} onClick={() => setConfirmation('close')}>{t('collection.close')}</button></section>}
      </aside>
    </div>
    {confirmation && <ConfirmDialog title={confirmation === 'close' ? t('collection.close') : t('collection.remove')} message={confirmation === 'close' ? t('collection.closeConfirm') : t('collection.removeConfirm')} confirmLabel={confirmation === 'close' ? t('collection.close') : t('collection.remove')} busy={managing} onCancel={() => setConfirmation(null)} onConfirm={() => void confirm()} />}
    {blocker.state === 'blocked' && <ConfirmDialog title={t('collection.leaveTitle')} message={t('upload.warning')} confirmLabel={t('collection.leave')} busy={false} onCancel={() => blocker.reset()} onConfirm={() => { abort.current?.abort(); blocker.proceed() }} />}
  </div>
}
