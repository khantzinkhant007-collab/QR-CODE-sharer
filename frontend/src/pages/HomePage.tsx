import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Camera, CheckCircle2, CloudUpload, ImagePlus, LockKeyhole, QrCode, RefreshCw, ShieldCheck, WifiOff } from 'lucide-react'
import { useEffect, useRef, useState, type DragEvent } from 'react'
import { Link, useBlocker, useNavigate } from 'react-router-dom'
import { uploadFile, UploadCancelledError } from '../api/uploadClient'
import { CameraCapture } from '../components/CameraCapture'
import { FilePreview } from '../components/FilePreview'
import { StatusBadge } from '../components/StatusBadge'
import { useOnlineStatus } from '../hooks/useOnlineStatus'
import { useI18n } from '../i18n'
import { formatBytes, validateSelectedFile } from '../lib/files'
import { effectiveUploadStatus, listUploads, saveUpload } from '../lib/history'
import type { UploadProgress } from '../types'

const MAX_MB = Number(import.meta.env.VITE_UPLOAD_MAX_MB ?? 2048) || 2048
const MAX_BYTES = MAX_MB * 1024 * 1024
const expirations = [
  { value: 10, en: '10 min', ja: '10分' },
  { value: 60, en: '1 hour', ja: '1時間' },
  { value: 1440, en: '24 hours', ja: '24時間' },
  { value: 10080, en: '7 days', ja: '7日' },
]

export function HomePage() {
  const { locale, t } = useI18n()
  const online = useOnlineStatus()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const inputRef = useRef<HTMLInputElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const allowSuccessNavigationRef = useRef(false)
  const [cameraOpen, setCameraOpen] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [expiration, setExpiration] = useState(1440)
  const [oneDownload, setOneDownload] = useState(false)
  const [password, setPassword] = useState('')
  const [progress, setProgress] = useState<UploadProgress | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const blocker = useBlocker(() => uploading && !allowSuccessNavigationRef.current)
  const history = useQuery({ queryKey: ['history'], queryFn: listUploads })

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null)
      return
    }
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  useEffect(() => {
    if (blocker.state !== 'blocked') return
    if (window.confirm(t('upload.warning'))) blocker.proceed()
    else blocker.reset()
  }, [blocker, t])

  useEffect(() => {
    const guard = (event: BeforeUnloadEvent) => {
      if (!uploading) return
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', guard)
    return () => window.removeEventListener('beforeunload', guard)
  }, [uploading])

  const chooseFile = (candidate?: File) => {
    if (!candidate) return
    const validation = validateSelectedFile(candidate, MAX_BYTES)
    if (validation) {
      setError(validation)
      setFile(null)
      return
    }
    setError(null)
    setProgress(null)
    setFile(candidate)
  }

  const startUpload = async () => {
    if (!file || uploading) return
    if (password && (Array.from(password).length < 12 || new TextEncoder().encode(password).length > 72)) {
      setError('password_invalid')
      return
    }
    if (!online) {
      setError('offline')
      return
    }
    const validation = validateSelectedFile(file, MAX_BYTES)
    if (validation) {
      setError(validation)
      return
    }
    const controller = new AbortController()
    allowSuccessNavigationRef.current = false
    abortRef.current = controller
    setUploading(true)
    setProgress(null)
    setError(null)
    try {
      const record = await uploadFile({
        file,
        expirationMinutes: expiration,
        maxDownloads: oneDownload ? 1 : null,
        password: password || undefined,
        signal: controller.signal,
        onProgress: setProgress,
      })
      await saveUpload(record)
      setPassword('')
      await queryClient.invalidateQueries({ queryKey: ['history'] })
      allowSuccessNavigationRef.current = true
      navigate(`/share/${record.id}`)
    } catch (caught) {
      setError(caught instanceof UploadCancelledError ? 'cancelled' : caught instanceof Error ? caught.message : 'upload_failed')
    } finally {
      setUploading(false)
      abortRef.current = null
    }
  }

  const errorText = error ? (error === 'too_large' ? t('file.tooLarge', { max: MAX_MB }) : error === 'unsupported_type' ? t('file.unsupported') : t(`upload.${error}`)) : null
  const recent = history.data?.slice(0, 3) ?? []

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setDragging(false)
    chooseFile(event.dataTransfer.files[0])
  }

  return <div className="space-y-10">
    <Link to="/events" className="glass-soft flex items-center justify-between gap-4 rounded-2xl px-5 py-4"><span><strong className="block">{t('collection.homeTitle')}</strong><span className="text-sm opacity-75">{t('collection.homeHint')}</span></span><QrCode className="shrink-0" size={24} /></Link>
    <section className="glass-hero relative overflow-hidden rounded-[2.25rem] p-3 sm:p-6">
      <div className="relative grid items-stretch gap-4 lg:grid-cols-[1.05fr_.95fr]">
        <div className="hero-copy rounded-[1.75rem] p-5 sm:p-8">
          <p className="glass-soft mb-4 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-black uppercase tracking-[.16em] text-teal-900 dark:text-teal-100"><LockKeyhole size={14} />{t('home.eyebrow')}</p>
          <h1 className="max-w-2xl text-4xl font-black leading-[1.02] tracking-[-.05em] sm:text-6xl">{t('home.title')}</h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-slate-600 dark:text-slate-300 sm:text-lg">{t('home.subtitle')}</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <button type="button" className="primary-button min-h-14" onClick={() => setCameraOpen(true)} disabled={uploading}><Camera size={21} />{t('home.takePhoto')}</button>
            <button type="button" className="secondary-button min-h-14" onClick={() => inputRef.current?.click()} disabled={uploading}><ImagePlus size={21} />{t('home.choose')}</button>
          </div>
          <p className="mt-4 flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300"><ShieldCheck className="mt-0.5 shrink-0 text-teal-700 dark:text-teal-300" size={17} />{t('home.privateNotice')}</p>
        </div>
        <div onDragEnter={() => setDragging(true)} onDragLeave={() => setDragging(false)} onDragOver={(event) => event.preventDefault()} onDrop={onDrop} className={`hidden min-h-72 place-items-center rounded-[2rem] p-8 text-center transition lg:grid ${dragging ? 'scale-[1.02] border-2 border-teal-500 bg-teal-100/70 dark:bg-teal-800/40' : 'glass-dropzone'}`}>
          <div><span className="mx-auto mb-5 grid size-20 place-items-center rounded-3xl bg-gradient-to-br from-teal-700 to-cyan-600 text-white shadow-xl shadow-teal-700/30"><CloudUpload size={34} /></span><p className="text-lg font-black">{t('home.drop')}</p><p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{t('home.max', { max: MAX_MB })}</p></div>
        </div>
      </div>
      <input ref={inputRef} className="sr-only" type="file" accept="image/*,video/*,.heic,.heif,.mov,.webm" onChange={(event) => { chooseFile(event.target.files?.[0]); event.target.value = '' }} aria-label={t('home.choose')} />
    </section>

    {file && previewUrl && <div className="space-y-6">
      <FilePreview file={file} url={previewUrl} onRemove={() => { if (!uploading) setFile(null) }} onChange={() => inputRef.current?.click()} />
      <section className="glass-panel grid gap-6 rounded-3xl p-6 lg:grid-cols-2">
        <div className="lg:col-span-2">
          <label htmlFor="download-password" className="mb-2 flex items-center gap-2 font-black"><LockKeyhole size={18} />{t('file.password')}</label>
          <input id="download-password" type="password" autoComplete="new-password" minLength={12} maxLength={72} value={password} disabled={uploading} onChange={(event) => setPassword(event.target.value)} aria-describedby="download-password-hint" className="glass-inset min-h-12 w-full rounded-2xl px-4 py-3" />
          <p id="download-password-hint" className="mt-2 text-sm text-slate-600 dark:text-slate-300">{t('file.passwordHint')}</p>
        </div>
        <fieldset disabled={uploading}><legend className="mb-3 font-black">{t('file.expiration')}</legend><div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-2">{expirations.map((option) => <label key={option.value} className={`cursor-pointer rounded-2xl border p-3 text-center text-sm font-bold transition has-focus-visible:ring-4 has-focus-visible:ring-teal-300 ${expiration === option.value ? 'border-teal-600 bg-teal-50/80 text-teal-900 dark:bg-teal-700/25 dark:text-teal-100' : 'glass-soft'}`}><input className="sr-only" type="radio" name="expiration" value={option.value} checked={expiration === option.value} onChange={() => setExpiration(option.value)} />{locale === 'ja' ? option.ja : option.en}</label>)}</div></fieldset>
        <div className="flex flex-col justify-between gap-5"><label className="glass-inset flex cursor-pointer items-start gap-3 rounded-2xl p-4"><input type="checkbox" className="mt-1 size-5 accent-teal-700" checked={oneDownload} disabled={uploading} onChange={(event) => setOneDownload(event.target.checked)} /><span><strong className="block">{t('file.oneDownload')}</strong><small className="text-slate-500 dark:text-slate-300">{t('file.oneDownloadHint')}</small></span></label><button type="button" className="primary-button min-h-14 w-full justify-center" disabled={uploading || !online} onClick={() => void startUpload()}>{uploading ? <RefreshCw className="animate-spin" size={20} /> : <QrCode size={20} />}{uploading ? t('upload.preparing') : t('file.upload')}</button></div>
      </section>
    </div>}

    {(uploading || progress) && <section className="glass-panel rounded-3xl p-6" aria-live="polite">
      <div className="mb-3 flex items-center justify-between gap-3"><strong>{progress ? t('upload.progress', { percent: progress.percent }) : t('upload.preparing')}</strong><span className="font-mono text-sm text-slate-500">{progress?.percent ?? 0}%</span></div>
      <progress className="upload-progress h-3 w-full" max="100" value={progress?.percent ?? 0} aria-label={t('upload.progress', { percent: progress?.percent ?? 0 })} />
      {progress && <p className="mt-3 text-sm text-slate-500">{formatBytes(progress.loaded)} / {formatBytes(progress.total)} · {formatBytes(progress.bytesPerSecond)}/s{progress.etaSeconds ? ` · ~${Math.ceil(progress.etaSeconds)}s` : ''}</p>}
      <p className="mt-3 text-xs text-slate-500">{t('upload.warning')}</p>
      {uploading && <button type="button" className="secondary-button mt-4" onClick={() => abortRef.current?.abort()}>{t('upload.cancel')}</button>}
    </section>}

    {!online && <div role="status" className="glass-warning flex items-center gap-3 rounded-2xl p-4 font-semibold"><WifiOff />{t('upload.offline')}</div>}
    {errorText && <div role="alert" className="glass-error rounded-2xl p-4 font-semibold"><p>{errorText === `upload.${error}` ? error : errorText}</p>{file && !uploading && <button type="button" className="secondary-button mt-3" onClick={() => void startUpload()}>{t('upload.retry')}</button>}</div>}

    <section>
      <div className="mb-4 flex items-end justify-between"><div><p className="section-kicker"><CheckCircle2 size={15} />{t('home.onDevice')}</p><h2 className="text-2xl font-black tracking-tight">{t('home.recent')}</h2></div><Link to="/history" className="text-sm font-bold text-teal-700 hover:underline dark:text-teal-300">{t('home.viewAll')}</Link></div>
      {history.isLoading ? <div className="skeleton h-28" /> : recent.length === 0 ? <div className="glass-soft rounded-3xl border-dashed p-8 text-center text-slate-600 dark:text-slate-300">{t('home.noRecent')}</div> : <div className="grid gap-3 md:grid-cols-3">{recent.map((item) => <Link key={item.id} to={`/share/${item.id}`} className="glass-panel rounded-2xl p-4 transition hover:-translate-y-1 hover:shadow-xl"><div className="flex items-start justify-between gap-3"><QrCode className="text-teal-700" /><StatusBadge status={effectiveUploadStatus(item)} /></div><p className="mt-4 truncate font-black">{item.originalName}</p><p className="text-sm text-slate-500 dark:text-slate-300">{formatBytes(item.sizeBytes)}</p></Link>)}</div>}
    </section>
    <CameraCapture open={cameraOpen} onSelect={chooseFile} onClose={() => setCameraOpen(false)} />
  </div>
}
