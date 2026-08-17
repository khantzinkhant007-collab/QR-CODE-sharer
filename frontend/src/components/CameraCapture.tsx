import { Camera, Check, RefreshCw, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useI18n } from '../i18n'

interface Props {
  open: boolean
  onSelect: (file: File) => void
  onClose: () => void
}

export function CameraCapture({ open, onSelect, onClose }: Props) {
  const { t } = useI18n()
  const videoRef = useRef<HTMLVideoElement>(null)
  const fallbackInputRef = useRef<HTMLInputElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [fallback, setFallback] = useState(false)
  const [captured, setCaptured] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [starting, setStarting] = useState(false)

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
  }, [])

  const startCamera = useCallback(async () => {
    stopCamera()
    setCaptured(null)
    setPreviewUrl((current) => {
      if (current) URL.revokeObjectURL(current)
      return null
    })
    if (!navigator.mediaDevices?.getUserMedia) {
      setFallback(true)
      return
    }
    setStarting(true)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: { ideal: 'environment' } },
      })
      streamRef.current = stream
      setFallback(false)
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
    } catch {
      setFallback(true)
      stopCamera()
    } finally {
      setStarting(false)
    }
  }, [stopCamera])

  useEffect(() => {
    if (open) void startCamera()
    return () => stopCamera()
  }, [open, startCamera, stopCamera])

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
  }, [previewUrl])

  if (!open) return null

  const capture = () => {
    const video = videoRef.current
    if (!video) return
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth || 1280
    canvas.height = video.videoHeight || 960
    canvas.getContext('2d')?.drawImage(video, 0, 0, canvas.width, canvas.height)
    canvas.toBlob((blob) => {
      if (!blob) return
      const file = new File([blob], `camera-${new Date().toISOString().replace(/[:.]/g, '-')}.jpg`, { type: 'image/jpeg' })
      setCaptured(file)
      setPreviewUrl(URL.createObjectURL(file))
      stopCamera()
    }, 'image/jpeg', 0.92)
  }

  const close = () => {
    stopCamera()
    onClose()
  }

  return <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/80 p-4 backdrop-blur" role="dialog" aria-modal="true" aria-labelledby="camera-title">
    <section className="w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-slate-900">
      <header className="flex items-center justify-between p-5"><div><h2 id="camera-title" className="text-xl font-black">{t('camera.title')}</h2><p className="text-sm text-slate-500">{t('camera.permission')}</p></div><button type="button" className="icon-button" onClick={close} aria-label={t('camera.cancel')}><X /></button></header>
      <div className="relative aspect-[4/3] overflow-hidden bg-slate-950">
        {captured && previewUrl ? <img src={previewUrl} alt={t('common.imagePreview')} className="size-full object-contain" /> : <video ref={videoRef} muted playsInline className="size-full object-cover" />}
        {starting && <div className="absolute inset-0 grid place-items-center text-white"><RefreshCw className="animate-spin" /></div>}
        {fallback && <div className="absolute inset-0 grid place-items-center p-8 text-center text-white"><div><Camera className="mx-auto mb-4" size={42} /><p>{t('camera.fallback')}</p><button type="button" className="mt-5 rounded-xl bg-white px-5 py-3 font-bold text-slate-900" onClick={() => fallbackInputRef.current?.click()}>{t('camera.fallbackButton')}</button></div></div>}
      </div>
      <footer className="flex flex-wrap justify-center gap-3 p-5">
        {!captured && !fallback && <button type="button" className="primary-button" onClick={capture}><Camera size={20} />{t('camera.capture')}</button>}
        {captured && <><button type="button" className="secondary-button" onClick={() => void startCamera()}><RefreshCw size={19} />{t('camera.retake')}</button><button type="button" className="primary-button" onClick={() => { onSelect(captured); close() }}><Check size={19} />{t('camera.use')}</button></>}
        <input ref={fallbackInputRef} type="file" className="sr-only" accept="image/*" capture="environment" aria-label={t('camera.fallbackButton')} onChange={(event) => { const file = event.target.files?.[0]; if (file) { onSelect(file); close() } }} />
      </footer>
    </section>
  </div>
}
