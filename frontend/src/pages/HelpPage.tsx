import { Camera, Download, Globe2, QrCode, Share2, Smartphone } from 'lucide-react'
import { useI18n } from '../i18n'

export function HelpPage() {
  const { locale, t } = useI18n()
  const content = locale === 'ja' ? {
    subtitle: '撮影から相手のダウンロードまで、アプリのインストールなしで完了します。',
    steps: [
      ['写真を撮る／選ぶ', 'カメラプレビューを使うか、端末の写真・動画選択画面からファイルを選びます。ライブラリ全体への権限は要求しません。'],
      ['期限を設定', '10分、1時間、24時間、7日から選び、必要なら1回だけのダウンロードにします。'],
      ['アップロード', '進捗を確認しながら待ちます。ページを閉じたり端末をロックすると停止する場合があります。'],
      ['QRを共有', 'QRを保存・共有するかリンクをコピーします。相手は通常のカメラで読み取れます。'],
    ],
    camera: 'localhost以外でカメラを使うには安全なHTTPS接続が必要です。別の電話で試すときは、同じWi-Fi上のPCのLAN IPかHTTPS開発トンネルを使用してください。QRにlocalhostを入れないでください。',
    limits: 'iPhone Safariではバックグラウンドや画面ロック時に大きなアップロードが停止しやすく、Web Shareの対応内容はOSバージョンにより異なります。HEIC/MOVの形式判定も端末によって異なります。',
  } : {
    subtitle: 'From capture to recipient download, with no app required on the receiving phone.',
    steps: [
      ['Capture or choose', 'Use the live camera preview or the device photo/video picker. ScanSend never asks for full-library access.'],
      ['Set the lifetime', 'Choose 10 minutes, 1 hour, 24 hours, or 7 days and optionally limit the link to one download.'],
      ['Upload securely', 'Watch real network progress and keep the page open. Locking the phone or closing the browser can stop a large upload.'],
      ['Share the QR', 'Save or share the QR image, or copy its link. The recipient scans it with a normal camera and downloads in the browser.'],
    ],
    camera: 'Camera access requires a secure HTTPS context outside localhost. For another phone, use the computer LAN IP on the same Wi-Fi or an HTTPS development tunnel. Never put localhost in a QR intended for another device.',
    limits: 'iPhone Safari may suspend large uploads in the background or on screen lock. Web Share capabilities vary by OS version, and HEIC/MOV MIME reporting varies by device.',
  }
  const icons = [Camera, Globe2, Download, QrCode]

  return <div className="space-y-8">
    <header className="max-w-3xl"><p className="section-kicker"><Share2 size={16} />{t('help.fourSteps')}</p><h1 className="page-title">{t('help.title')}</h1><p className="page-subtitle">{content.subtitle}</p></header>
    <div className="grid gap-4 md:grid-cols-2">{content.steps.map(([title, body], index) => {
      const Icon = icons[index]
      return <article key={title} className="glass-panel relative overflow-hidden rounded-3xl p-6"><span className="absolute right-5 top-4 text-5xl font-black text-teal-900/10 dark:text-cyan-100/10">0{index + 1}</span><Icon className="relative mb-5 text-teal-700 dark:text-teal-300" size={30} /><h2 className="relative text-xl font-black">{title}</h2><p className="relative mt-2 leading-7 text-slate-600 dark:text-slate-300">{body}</p></article>
    })}</div>
    <section className="glass-soft rounded-3xl p-6"><h2 className="flex items-center gap-2 text-xl font-black"><Smartphone />{t('help.install')}</h2><ul className="mt-4 space-y-3 text-slate-700 dark:text-slate-200"><li>{t('help.android')}</li><li>{t('help.iphone')}</li></ul></section>
    <section className="grid gap-4 lg:grid-cols-2"><div className="glass-feature rounded-3xl p-6 text-slate-100"><h2 className="text-lg font-black">{t('help.httpsTitle')}</h2><p className="mt-3 leading-7 text-teal-50">{content.camera}</p></div><div className="glass-panel rounded-3xl p-6"><h2 className="text-lg font-black">{t('help.limitationsTitle')}</h2><p className="mt-3 leading-7 text-slate-600 dark:text-slate-300">{content.limits}</p></div></section>
  </div>
}

