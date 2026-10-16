import { useQuery } from '@tanstack/react-query'
import { ArrowRight, CalendarClock, FolderPlus, UsersRound } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { createCollection } from '../api/collectionClient'
import { mapApiError } from '../api/uploadClient'
import { useI18n } from '../i18n'
import { collectionDeadline, localDateTime } from '../lib/collections'
import { listCollections, saveCollection } from '../lib/history'

export function CollectionsPage() {
  const { t, locale } = useI18n()
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [deadline, setDeadline] = useState(() => localDateTime(new Date(Date.now() + 86_400_000)))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const history = useQuery({ queryKey: ['collections'], queryFn: listCollections })
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (busy) return
    setBusy(true)
    setError('')
    try {
      const expires_at = collectionDeadline(deadline)
      const record = await createCollection({ title: title.trim(), description: description.trim(), expires_at })
      await saveCollection(record)
      await navigate(`/events/${record.token}`)
    } catch (failure) {
      setError(mapApiError(failure))
    } finally {
      setBusy(false)
    }
  }
  return <div className="space-y-8">
    <header><p className="section-kicker"><UsersRound size={16} />{t('collection.eyebrow')}</p><h1 className="page-title">{t('collection.title')}</h1><p className="page-subtitle">{t('collection.subtitle')}</p></header>
    <div className="grid items-start gap-6 lg:grid-cols-[1.15fr_.85fr]">
      <form onSubmit={(event) => void submit(event)} className="glass-panel space-y-5 rounded-3xl p-6 sm:p-8">
        <h2 className="flex items-center gap-2 text-xl font-black"><FolderPlus size={22} />{t('collection.create')}</h2>
        <label className="block text-sm font-bold">{t('collection.name')}<input required maxLength={120} value={title} onChange={(event) => setTitle(event.target.value)} className="glass-inset mt-2 min-h-12 w-full rounded-2xl px-4" placeholder={t('collection.namePlaceholder')} /></label>
        <label className="block text-sm font-bold">{t('collection.description')}<textarea maxLength={1000} rows={3} value={description} onChange={(event) => setDescription(event.target.value)} className="glass-inset mt-2 w-full resize-y rounded-2xl p-4" /></label>
        <label className="block text-sm font-bold">{t('collection.deadline')}<input required type="datetime-local" value={deadline} min={localDateTime(new Date(Date.now() + 60_000))} onChange={(event) => setDeadline(event.target.value)} className="glass-inset mt-2 min-h-12 w-full rounded-2xl px-4" /><span className="mt-2 block text-xs font-normal opacity-75">{t('collection.deadlineHint')}</span></label>
        <p className="glass-warning rounded-2xl p-4 text-sm leading-6">{t('collection.accessNotice')}</p>
        {error && <p role="alert" className="error-box">{t(`upload.${error}`) !== `upload.${error}` ? t(`upload.${error}`) : t(error)}</p>}
        <button className="primary-button w-full" disabled={busy || !title.trim()}>{busy ? t('collection.creating') : t('collection.createQr')}<ArrowRight size={18} /></button>
      </form>
      <aside className="space-y-5">
        <section className="glass-feature rounded-3xl p-7 text-white"><CalendarClock size={28} /><h2 className="mt-4 text-2xl font-black">{t('collection.emptyFirst')}</h2><p className="mt-3 leading-7 opacity-90">{t('collection.explanation')}</p></section>
        <section className="glass-panel rounded-3xl p-6"><h2 className="font-black">{t('collection.myCollections')}</h2><p className="mt-2 text-xs leading-5 opacity-70">{t('collection.ownerNotice')}</p>
          <div className="mt-4 space-y-3">{history.data?.map((item) => <Link key={item.token} to={`/events/${item.token}`} className="glass-soft flex items-center justify-between gap-3 rounded-2xl p-4"><div className="min-w-0"><p className="truncate font-bold">{item.title}</p><p className="mt-1 text-xs opacity-70">{new Date(item.expiresAt).toLocaleString(locale)}</p></div><ArrowRight size={18} className="shrink-0" /></Link>)}{history.data?.length === 0 && <p className="text-sm opacity-70">{t('collection.noCollections')}</p>}</div>
        </section>
      </aside>
    </div>
  </div>
}
