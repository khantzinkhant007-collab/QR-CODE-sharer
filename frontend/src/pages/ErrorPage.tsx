import { TriangleAlert } from 'lucide-react'
import { Link, useRouteError } from 'react-router-dom'
import { useI18n } from '../i18n'

export function ErrorPage() {
  const error = useRouteError()
  const { t } = useI18n()

  return <section className="empty-state">
    <TriangleAlert size={48} className="text-rose-600" />
    <h1 className="text-2xl font-black">{t('common.error')}</h1>
    <p className="max-w-xl text-slate-500">{error instanceof Error ? error.message : t('common.unavailable')}</p>
    <Link to="/" className="primary-button">ScanSend</Link>
  </section>
}

