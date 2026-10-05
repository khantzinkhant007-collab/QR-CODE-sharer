import { Database, EyeOff, FileLock2, KeyRound, ShieldCheck, Smartphone } from 'lucide-react'
import { useI18n } from '../i18n'

export function PrivacyPage() {
  const { locale, t } = useI18n()
  const copy = locale === 'ja' ? {
    subtitle: 'ファイル、トークン、ブラウザ履歴がどこに保存されるかを明確にします。',
    cards: [
      ['ファイル本体', 'Laravel Storageを通じて非公開ファイル／オブジェクトストレージに保存され、公開ディレクトリには置かれません。'],
      ['MySQLメタデータ', 'ファイル名、MIME形式、サイズ、有効期限、ダウンロード数、非公開ストレージのパスだけを保存します。BLOBは使用しません。'],
      ['安全なトークン', 'ダウンロード用と管理用に別々の256ビットトークンを生成し、サーバーにはSHA-256ハッシュだけを保存します。'],
      ['このブラウザ', '管理トークンを含む送信履歴はIndexedDBにのみ保存します。ファイル本体はブラウザに保存しません。'],
    ],
    footer: '期限切れファイルは定期処理で削除されます。本番環境ではHTTPS、厳格なCORS、レート制限、利用量制限、CAPTCHAや不正利用報告の仕組みも必要です。',
  } : {
    subtitle: 'A plain-language map of where file bytes, tokens, and browser history live.',
    cards: [
      ['File bytes', 'Stored through Laravel Storage in a private local directory or private object bucket—never in a public web directory.'],
      ['MySQL metadata', 'Stores the filename, MIME type, size, expiration, counts, and private storage pointer. It never stores a file BLOB.'],
      ['Secure tokens', 'Download and management access use separate 256-bit tokens. The server retains only their SHA-256 hashes.'],
      ['This browser', 'Sender history and management access stay in IndexedDB. Uploaded file contents are never copied into browser storage.'],
    ],
    footer: 'Expired files are purged on a schedule. A public launch should also enforce HTTPS, strict CORS, quotas, CAPTCHA or device challenges, and an abuse-reporting process.',
  }
  const icons = [FileLock2, Database, KeyRound, Smartphone]

  return <div className="space-y-8">
    <header className="max-w-3xl">
      <p className="section-kicker"><ShieldCheck size={16} />{t('privacy.architecture')}</p>
      <h1 className="page-title">{t('privacy.title')}</h1>
      <p className="page-subtitle">{copy.subtitle}</p>
    </header>
    <section className="glass-feature rounded-3xl p-6 text-teal-50 sm:p-8"><p className="text-lg leading-8">{t('privacy.body')}</p></section>
    <section>
      <h2 className="mb-4 text-2xl font-black">{t('privacy.items')}</h2>
      <div className="grid gap-4 md:grid-cols-2">{copy.cards.map(([title, body], index) => {
        const Icon = icons[index]
        return <article key={title} className="glass-panel rounded-3xl p-6"><Icon className="mb-5 text-teal-700 dark:text-teal-300" size={30} /><h3 className="text-lg font-black">{title}</h3><p className="mt-2 leading-7 text-slate-600 dark:text-slate-300">{body}</p></article>
      })}</div>
    </section>
    <div className="glass-soft flex gap-3 rounded-2xl p-5"><EyeOff className="shrink-0 text-teal-700" /><div><strong>{t('privacy.noAnalytics')}</strong><p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{copy.footer}</p></div></div>
  </div>
}

