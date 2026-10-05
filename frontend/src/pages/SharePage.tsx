import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, Clock3, Copy, Download, FileDown, Link2, QrCode, Share2, Trash2, UploadCloud } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { deleteRemoteUpload, fetchUploadStatus } from '../api/uploadClient'
import { StatusBadge } from '../components/StatusBadge'
import { useCountdown } from '../hooks/useCountdown'
import { useOnlineStatus } from '../hooks/useOnlineStatus'
import { useI18n } from '../i18n'
import { formatBytes } from '../lib/files'
import { getUpload, setUploadStatus } from '../lib/history'
import { generateQrDataUrl } from '../lib/qr'
import { copyText, dataUrlToFile } from '../lib/share'

export function SharePage() {
  const { uploadId = '' } = useParams()
  const { locale, t } = useI18n()
  const online = useOnlineStatus()
  const queryClient = useQueryClient()
  const [copied, setCopied] = useState(false)
  const recordQuery = useQuery({ queryKey: ['upload', uploadId], queryFn: () => getUpload(uploadId), enabled: Boolean(uploadId) })
  const record = recordQuery.data
  const countdown = useCountdown(record?.expiresAt ?? new Date().toISOString())
  const statusQuery = useQuery({
    queryKey: ['upload-status', uploadId],
    queryFn: () => fetchUploadStatus(uploadId, record!.managementToken),
    enabled: Boolean(record && online && record.localStatus === 'active'),
    refetchInterval: 15_000,
    retry: 1,
  })
  const qrQuery = useQuery({ queryKey: ['qr', record?.downloadUrl], queryFn: () => generateQrDataUrl(record!.downloadUrl), enabled: Boolean(record?.downloadUrl) })

  useEffect(() => {
    if (!statusQuery.data || !record) return
    void setUploadStatus(record.id, statusQuery.data.status, statusQuery.data.download_count).then(() => queryClient.invalidateQueries({ queryKey: ['upload', uploadId] }))
  }, [statusQuery.data, record, queryClient, uploadId])

  const deleteMutation = useMutation({
    mutationFn: () => deleteRemoteUpload(record!.id, record!.managementToken),
    onSuccess: async () => {
      await setUploadStatus(record!.id, 'deleted')
      queryClient.setQueryData(['upload-status', uploadId], (current: typeof statusQuery.data) => current ? { ...current, status: 'deleted', file_exists: false } : current)
      await queryClient.invalidateQueries({ queryKey: ['upload', uploadId] })
      await queryClient.invalidateQueries({ queryKey: ['history'] })
    },
  })

  if (recordQuery.isLoading) return <div className="skeleton mx-auto h-[560px] max-w-2xl" aria-label={t('share.loading')} />
  if (!record) return <section className="empty-state"><QrCode size={48} /><h1 className="text-2xl font-black">{t('share.missing')}</h1><Link to="/history" className="primary-button">{t('nav.history')}</Link></section>

  const serverStatus = record.localStatus === 'deleted' ? 'deleted' : (statusQuery.data?.status ?? record.localStatus)
  const status = countdown.expired && serverStatus === 'active' ? 'expired' : serverStatus
  const downloadCount = statusQuery.data?.download_count ?? record.downloadCount
  const parsedDownloadUrl = new URL(record.downloadUrl)
  const localUrl = parsedDownloadUrl.protocol !== 'https:' || ['localhost', '127.0.0.1'].includes(parsedDownloadUrl.hostname)
  const expiresLabel = new Intl.DateTimeFormat(locale, {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZoneName: 'short',
  }).format(new Date(record.expiresAt))

  const copy = async () => {
    await copyText(record.downloadUrl)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1800)
  }
  const shareLink = async () => {
    if (navigator.share) await navigator.share({ title: `ScanSend · ${record.originalName}`, text: record.originalName, url: record.downloadUrl })
    else await copy()
  }
  const downloadQr = () => {
    if (!qrQuery.data) return
    const anchor = document.createElement('a')
    anchor.href = qrQuery.data
    anchor.download = `scansend-${record.id}.png`
    anchor.click()
  }
  const shareQr = async () => {
    if (!qrQuery.data) return
    const file = dataUrlToFile(qrQuery.data, `scansend-${record.id}.png`)
    if (navigator.share && (!navigator.canShare || navigator.canShare({ files: [file] }))) await navigator.share({ title: 'ScanSend QR', files: [file] })
    else downloadQr()
  }

  return <div className="mx-auto max-w-4xl space-y-6">
    <header className="text-center"><p className="section-kicker justify-center"><Check size={16} />{t('share.created')}</p><h1 className="page-title">{t('share.title')}</h1><p className="page-subtitle mx-auto">{t('share.subtitle')}</p></header>
    {localUrl && <div className="glass-warning rounded-2xl p-4 text-sm font-semibold">{t('share.localWarning')}</div>}
    <section className="glass-panel grid overflow-hidden rounded-[2rem] lg:grid-cols-[1fr_.92fr]">
      <div className="glass-inset grid place-items-center p-6 sm:p-10">{qrQuery.isLoading ? <div className="skeleton aspect-square w-full max-w-sm" /> : qrQuery.data ? <div className="rounded-[2rem] border border-white/80 bg-white p-5 shadow-xl"><img src={qrQuery.data} alt={`QR download link for ${record.originalName}`} className="aspect-square w-full max-w-sm" /></div> : <p role="alert">{t('common.error')}</p>}</div>
      <div className="flex flex-col p-6 sm:p-8"><div className="flex items-start justify-between gap-4"><div className="min-w-0"><p className="truncate text-xl font-black">{record.originalName}</p><p className="mt-1 text-sm text-slate-500">{record.mimeType} · {formatBytes(record.sizeBytes)}</p></div><StatusBadge status={status} /></div>
        <dl className="mt-7 grid grid-cols-3 gap-2"><div className="metric"><dt>{t('share.expires')}</dt><dd>{status === 'expired' ? t('share.expired') : countdown.label}</dd></div><div className="metric"><dt>{t('share.allowed')}</dt><dd>{record.maxDownloads ?? '∞'}</dd></div><div className="metric"><dt>{t('share.downloaded')}</dt><dd>{downloadCount}</dd></div></dl>
        <p className="glass-inset mt-5 rounded-2xl p-4 text-sm leading-6 text-slate-600 dark:text-slate-300"><Clock3 className="mr-2 inline text-teal-600" size={17} />{t('share.qrNotice', { time: expiresLabel })}</p>
        <div className="mt-6 grid grid-cols-2 gap-2"><button type="button" className="secondary-button justify-center" onClick={() => void copy()}>{copied ? <Check size={18} /> : <Copy size={18} />}{copied ? t('share.copied') : t('share.copy')}</button><button type="button" className="secondary-button justify-center" onClick={() => void shareLink()}><Share2 size={18} />{t('share.shareLink')}</button><button type="button" className="secondary-button justify-center" onClick={downloadQr} disabled={!qrQuery.data}><Download size={18} />{t('share.downloadQr')}</button><button type="button" className="secondary-button justify-center" onClick={() => void shareQr()} disabled={!qrQuery.data}><FileDown size={18} />{t('share.shareQr')}</button></div>
        <div className="mt-auto flex flex-wrap gap-2 pt-7"><Link to="/" className="primary-button"><UploadCloud size={18} />{t('share.another')}</Link>{status !== 'deleted' && <button type="button" className="danger-button" disabled={!online || deleteMutation.isPending} onClick={() => { if (window.confirm(t('history.confirmDelete'))) deleteMutation.mutate() }}><Trash2 size={18} />{t('share.delete')}</button>}</div>
      </div>
    </section>
    <div className="glass-soft flex items-start gap-3 rounded-2xl p-4 text-sm text-slate-600 dark:text-slate-300"><Link2 className="shrink-0 text-teal-700" /><span className="break-all">{record.downloadUrl}</span></div>
  </div>
}
