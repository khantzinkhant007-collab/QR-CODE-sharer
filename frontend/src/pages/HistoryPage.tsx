import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ExternalLink, FileImage, Film, History, RefreshCw, Trash2, Unlink } from 'lucide-react'
import { Link } from 'react-router-dom'
import { deleteRemoteUpload, fetchUploadStatus } from '../api/uploadClient'
import { StatusBadge } from '../components/StatusBadge'
import { useOnlineStatus } from '../hooks/useOnlineStatus'
import { useI18n } from '../i18n'
import { formatBytes } from '../lib/files'
import { effectiveUploadStatus, listUploads, removeLocalUpload, setUploadStatus } from '../lib/history'
import type { UploadRecord } from '../types'

export function HistoryPage() {
  const { locale, t } = useI18n()
  const online = useOnlineStatus()
  const queryClient = useQueryClient()
  const historyQuery = useQuery({ queryKey: ['history'], queryFn: listUploads })

  const refreshMutation = useMutation({
    mutationFn: async (record: UploadRecord) => fetchUploadStatus(record.id, record.managementToken),
    onSuccess: async (status, record) => {
      await setUploadStatus(record.id, status.status, status.download_count)
      await queryClient.invalidateQueries({ queryKey: ['history'] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (record: UploadRecord) => deleteRemoteUpload(record.id, record.managementToken),
    onSuccess: async (_, record) => {
      await setUploadStatus(record.id, 'deleted')
      await queryClient.invalidateQueries({ queryKey: ['history'] })
    },
  })

  const removeLocal = async (record: UploadRecord) => {
    if (!window.confirm(t('history.confirmLocal'))) return
    await removeLocalUpload(record.id)
    await queryClient.invalidateQueries({ queryKey: ['history'] })
  }

  const deleteEverywhere = (record: UploadRecord) => {
    if (window.confirm(t('history.confirmDelete'))) deleteMutation.mutate(record)
  }

  const uploads = historyQuery.data ?? []

  return <div className="space-y-7">
    <section className="max-w-3xl"><p className="section-kicker"><History size={16} />IndexedDB</p><h1 className="page-title">{t('history.title')}</h1><p className="page-subtitle">{t('history.subtitle')}</p></section>
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100">{t('history.clearWarning')}</div>
    {historyQuery.isLoading ? <div className="space-y-3"><div className="skeleton h-40" /><div className="skeleton h-40" /></div> : uploads.length === 0 ? <section className="grid min-h-72 place-items-center rounded-3xl border border-dashed border-slate-300 text-center dark:border-slate-700"><div><Unlink className="mx-auto mb-4 text-slate-400" size={42} /><h2 className="text-xl font-black">{t('history.empty')}</h2><Link to="/" className="primary-button mt-5">{t('nav.home')}</Link></div></section> : <div className="grid gap-4 lg:grid-cols-2">{uploads.map((record) => {
      const status = effectiveUploadStatus(record)
      const active = status === 'active'
      return <article key={record.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-lg shadow-slate-200/30 dark:border-slate-800 dark:bg-slate-900 dark:shadow-none">
        <div className="flex items-start gap-4"><span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-200">{record.mimeType.startsWith('video/') ? <Film /> : <FileImage />}</span><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><h2 className="truncate font-black">{record.originalName}</h2><StatusBadge status={status} /></div><p className="mt-1 text-sm text-slate-500">{formatBytes(record.sizeBytes)} · {new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(record.createdAt))}</p></div></div>
        <dl className="mt-5 grid grid-cols-2 gap-3 rounded-2xl bg-slate-50 p-4 text-sm dark:bg-slate-950"><div><dt className="text-slate-500">{t('share.downloaded')}</dt><dd className="mt-1 text-lg font-black">{record.downloadCount}</dd></div><div><dt className="text-slate-500">{t('share.allowed')}</dt><dd className="mt-1 text-lg font-black">{record.maxDownloads ?? '∞'}</dd></div></dl>
        <div className="mt-5 flex flex-wrap gap-2">{active && <Link to={`/share/${record.id}`} className="secondary-button"><ExternalLink size={17} />{t('history.open')}</Link>}{active && online && <button type="button" className="secondary-button" onClick={() => refreshMutation.mutate(record)} disabled={refreshMutation.isPending}><RefreshCw size={17} className={refreshMutation.isPending ? 'animate-spin' : ''} />{t('common.refresh')}</button>}{status !== 'deleted' && online && <button type="button" className="danger-button" onClick={() => deleteEverywhere(record)} disabled={deleteMutation.isPending}><Trash2 size={17} />{t('history.deleteRemote')}</button>}<button type="button" className="ghost-button" onClick={() => void removeLocal(record)}>{t('history.removeLocal')}</button></div>
      </article>
    })}</div>}
    {deleteMutation.isError && <p role="alert" className="error-box">{t('history.failedDelete')}</p>}
  </div>
}
