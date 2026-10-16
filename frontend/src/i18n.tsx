import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import { collectionEn, collectionJa } from './collectionMessages'

type Locale = 'en' | 'ja'
type Values = Record<string, string | number>

const en: Record<string, string> = {
  ...collectionEn,
  'file.password': 'Download password (optional)',
  'file.passwordHint': 'Leave blank for anyone with the link. Otherwise use a long passphrase (at least 12 characters) and share it separately. ScanSend cannot recover it.',
  'upload.password_not_supported': 'The server has not enabled password protection yet. The unprotected upload was deleted. Update the backend before retrying.',
  'upload.password_cleanup_failed': 'The server did not confirm password protection and cleanup failed. Do not share this upload; contact the server operator to remove it.',
  'upload.password_invalid': 'Use at least 12 characters and no more than 72 UTF-8 bytes. Japanese characters usually use 3 bytes each.',
  'share.passwordProtected': 'Password protected. Share the password separately from this QR code or link. ScanSend does not save a recoverable copy.',
  'nav.home': 'Send', 'nav.history': 'History', 'nav.privacy': 'Privacy', 'nav.help': 'Help',
  'brand.tagline': 'private QR transfer', 'status.online': 'Online', 'status.offline': 'Offline · uploads need internet',
  'common.skip': 'Skip to content', 'common.primaryNav': 'Primary navigation', 'common.language': 'Change language', 'common.theme': 'Toggle color theme',
  'common.imagePreview': 'Selected file preview', 'common.videoPreview': 'Selected video preview', 'common.refresh': 'Refresh',
  'home.eyebrow': 'Private by design', 'home.title': 'Send a moment. Not your data trail.',
  'home.subtitle': 'Choose a photo or video, set an expiration, and share a secure download link as a QR code.',
  'home.takePhoto': 'Take Photo', 'home.choose': 'Choose Photo or Video', 'home.drop': 'or drop a file here',
  'home.privateNotice': 'Selected files are uploaded to your configured ScanSend server and stored privately until expiration.',
  'home.max': 'Images and videos up to {{max}} MB', 'home.recent': 'Recent uploads', 'home.viewAll': 'View all',
  'home.noRecent': 'Your recent QR links will appear here on this device.',
  'home.onDevice': 'On this device',
  'file.change': 'Remove or change file', 'file.name': 'File name', 'file.type': 'Detected type', 'file.size': 'File size',
  'file.expiration': 'Link expiration', 'file.oneDownload': 'Allow only one download',
  'file.oneDownloadHint': 'The first completed request consumes the link.', 'file.upload': 'Create secure QR link',
  'file.tooLarge': 'This file exceeds the {{max}} MB limit and was not sent.', 'file.unsupported': 'Choose an image or video file.',
  'upload.preparing': 'Preparing secure upload…', 'upload.progress': '{{percent}}% uploaded', 'upload.cancel': 'Cancel upload',
  'upload.retry': 'Retry upload', 'upload.warning': 'Keep this page open and your device awake. Browsers may stop uploads when closed or locked.',
  'upload.offline': 'You are offline. Reconnect before uploading.', 'upload.cancelled': 'Upload cancelled. Your file was not saved on the server.',
  'upload.network_error': 'The network connection was interrupted. Reconnect and retry.', 'upload.rate_limited': 'Too many uploads. Wait a minute and retry.',
  'upload.upload_failed': 'The upload could not be completed. Please retry.',
  'upload.server_unavailable': 'The ScanSend server is unavailable. Please try again later or contact the site owner.',
  'camera.title': 'Take a photo', 'camera.permission': 'Allow camera access to frame your photo.', 'camera.start': 'Open camera',
  'camera.capture': 'Capture', 'camera.retake': 'Retake', 'camera.use': 'Use photo', 'camera.cancel': 'Cancel',
  'camera.fallback': 'Camera preview is unavailable. Use your device camera picker instead.', 'camera.fallbackButton': 'Use camera picker',
  'history.title': 'Your upload history', 'history.subtitle': 'Management access stays only in this browser’s IndexedDB.',
  'history.empty': 'No uploads yet', 'history.clearWarning': 'Clearing browser storage removes your ability to check or delete past uploads.',
  'history.open': 'Open QR', 'history.deleteRemote': 'Delete everywhere', 'history.removeLocal': 'Remove from this device',
  'history.confirmDelete': 'Delete the private file and permanently disable its QR link?', 'history.confirmLocal': 'Remove local history? This does not delete the server file.',
  'history.deleted': 'Upload deleted.', 'history.failedDelete': 'Could not delete the server file. Please retry.',
  'share.loading': 'Loading your secure link…', 'share.missing': 'This upload is not in this browser history.',
  'share.created': 'Secure link created',
  'share.title': 'Ready to scan', 'share.subtitle': 'Point any phone camera at the QR code. No ScanSend app is required.',
  'share.copy': 'Copy link', 'share.copied': 'Link copied', 'share.shareLink': 'Share link', 'share.downloadQr': 'Save QR as PNG',
  'share.shareQr': 'Share QR image', 'share.delete': 'Delete upload', 'share.another': 'Upload another file',
  'share.expires': 'Expires in', 'share.expired': 'Expired', 'share.allowed': 'Allowed downloads', 'share.unlimited': 'Until expiration',
  'share.downloaded': 'Downloads', 'share.qrNotice': 'The QR image itself does not expire, but this download link expires at {{time}}.',
  'share.localWarning': 'This QR uses a local-development or non-HTTPS URL. It works only when the other phone can reach that address; prefer an HTTPS tunnel or deployed HTTPS URL.',
  'privacy.title': 'Privacy, without fine print', 'privacy.body': 'ScanSend uploads your selected file to private server storage. MySQL contains metadata and hashed tokens only—not the file bytes.',
  'privacy.architecture': 'Privacy architecture',
  'privacy.items': 'What ScanSend keeps', 'privacy.noAnalytics': 'No third-party analytics are enabled by default.',
  'help.title': 'How to use ScanSend', 'help.install': 'Install the PWA', 'help.android': 'Android: open the browser menu and choose Install app.',
  'help.fourSteps': 'Four simple steps', 'help.httpsTitle': 'HTTPS & phone testing', 'help.limitationsTitle': 'Browser limitations',
  'help.iphone': 'iPhone: tap Share, then Add to Home Screen.', 'help.steps': 'Choose or take a photo, set expiration, upload, then let the recipient scan the QR.',
  'pwa.update': 'A new ScanSend version is ready.', 'pwa.reload': 'Update now', 'pwa.close': 'Later',
  'common.active': 'Active', 'common.expired': 'Expired', 'common.deleted': 'Deleted', 'common.failed': 'Failed',
  'common.close': 'Close', 'common.file': 'File', 'common.error': 'Something went wrong.',
  'common.unavailable': 'The requested page is unavailable.',
}

const ja: Record<string, string> = {
  ...collectionJa,
  'upload.password_not_supported': 'サーバーがまだパスワード保護に対応していません。保護されていないアップロードは削除しました。サーバー更新後に再試行してください。',
  'upload.password_cleanup_failed': 'パスワード保護を確認できず、削除にも失敗しました。このアップロードは共有せず、サーバー管理者に削除を依頼してください。',
  'file.password': 'ダウンロード用パスワード（任意）',
  'file.passwordHint': '空欄の場合、リンクを知っている人がダウンロードできます。設定する場合は12文字以上、UTF-8で72バイト以内にし、リンクとは別に伝えてください。パスワードは復元できません。',
  'upload.password_invalid': '12文字以上、UTF-8で72バイト以内にしてください。日本語は通常1文字3バイトです。',
  'share.passwordProtected': 'パスワードで保護されています。QRコードやリンクとは別にパスワードを伝えてください。ScanSendではパスワードを復元できません。',
  'nav.home': '送信', 'nav.history': '履歴', 'nav.privacy': 'プライバシー', 'nav.help': 'ヘルプ',
  'brand.tagline': '安全なQR転送', 'status.online': 'オンライン', 'status.offline': 'オフライン・アップロードには通信が必要です',
  'common.skip': '本文へ移動', 'common.primaryNav': 'メインナビゲーション', 'common.language': '言語を変更', 'common.theme': '配色を変更',
  'common.imagePreview': '選択した画像のプレビュー', 'common.videoPreview': '選択した動画のプレビュー', 'common.refresh': '更新',
  'home.eyebrow': 'プライバシーを大切に', 'home.title': '思い出を、安全なリンクで。',
  'home.subtitle': '写真や動画を選び、有効期限を設定して、安全なダウンロードQRコードを共有できます。',
  'home.takePhoto': '写真を撮る', 'home.choose': '写真または動画を選ぶ', 'home.drop': 'またはファイルをここにドロップ',
  'home.privateNotice': '選択したファイルは設定済みのScanSendサーバーへアップロードされ、有効期限まで非公開で保存されます。',
  'home.max': '{{max}} MBまでの画像・動画', 'home.recent': '最近のアップロード', 'home.viewAll': 'すべて表示',
  'home.noRecent': 'この端末で作成したQRリンクがここに表示されます。',
  'home.onDevice': 'この端末に保存',
  'file.change': 'ファイルを削除・変更', 'file.name': 'ファイル名', 'file.type': '検出形式', 'file.size': 'ファイルサイズ',
  'file.expiration': 'リンクの有効期限', 'file.oneDownload': '1回だけダウンロードを許可',
  'file.oneDownloadHint': '最初の完了リクエストでリンクが無効になります。', 'file.upload': '安全なQRリンクを作成',
  'file.tooLarge': 'このファイルは{{max}} MBの上限を超えているため送信されません。', 'file.unsupported': '画像または動画を選択してください。',
  'upload.preparing': '安全なアップロードを準備中…', 'upload.progress': '{{percent}}% アップロード済み', 'upload.cancel': 'アップロードを中止',
  'upload.retry': 'もう一度試す', 'upload.warning': 'このページを開いたまま端末をスリープさせないでください。ブラウザを閉じると停止する場合があります。',
  'upload.offline': 'オフラインです。接続してからアップロードしてください。', 'upload.cancelled': 'アップロードを中止しました。サーバーには保存されていません。',
  'upload.network_error': '通信が中断されました。再接続してやり直してください。', 'upload.rate_limited': 'アップロード回数が多すぎます。1分待ってください。',
  'upload.upload_failed': 'アップロードできませんでした。もう一度お試しください。',
  'upload.server_unavailable': 'ScanSendサーバーが利用できません。時間をおいて再試行するか、サイト管理者にお問い合わせください。',
  'camera.title': '写真を撮る', 'camera.permission': 'カメラへのアクセスを許可してください。', 'camera.start': 'カメラを開く',
  'camera.capture': '撮影', 'camera.retake': '撮り直す', 'camera.use': 'この写真を使う', 'camera.cancel': 'キャンセル',
  'camera.fallback': 'カメラプレビューを利用できません。端末のカメラ選択を使用してください。', 'camera.fallbackButton': '端末カメラを使う',
  'history.title': 'アップロード履歴', 'history.subtitle': '管理情報はこのブラウザのIndexedDBだけに保存されます。',
  'history.empty': 'アップロードはまだありません', 'history.clearWarning': 'ブラウザデータを消去すると、過去のアップロードを確認・削除できなくなります。',
  'history.open': 'QRを開く', 'history.deleteRemote': 'サーバーから削除', 'history.removeLocal': 'この端末の履歴から削除',
  'history.confirmDelete': '非公開ファイルを削除し、QRリンクを永久に無効にしますか？', 'history.confirmLocal': 'ローカル履歴から削除しますか？サーバーのファイルは削除されません。',
  'history.deleted': 'アップロードを削除しました。', 'history.failedDelete': 'サーバーのファイルを削除できませんでした。',
  'share.loading': '安全なリンクを読み込み中…', 'share.missing': 'このアップロードはブラウザ履歴にありません。',
  'share.created': '安全なリンクを作成しました',
  'share.title': 'スキャンできます', 'share.subtitle': 'どのスマートフォンのカメラでも使えます。ScanSendアプリは不要です。',
  'share.copy': 'リンクをコピー', 'share.copied': 'コピーしました', 'share.shareLink': 'リンクを共有', 'share.downloadQr': 'QRをPNG保存',
  'share.shareQr': 'QR画像を共有', 'share.delete': 'アップロードを削除', 'share.another': '別のファイルを送る',
  'share.expires': '残り時間', 'share.expired': '期限切れ', 'share.allowed': 'ダウンロード上限', 'share.unlimited': '期限まで無制限',
  'share.downloaded': 'ダウンロード数', 'share.qrNotice': 'QR画像自体に期限はありませんが、このダウンロードリンクは{{time}}に期限切れになります。',
  'share.localWarning': 'このQRはローカル開発用またはHTTPのURLです。別の端末から到達できる場合だけ動作します。HTTPSトンネルまたは公開HTTPS URLを推奨します。',
  'privacy.title': 'わかりやすいプライバシー', 'privacy.body': 'ファイルは非公開ストレージへ保存され、MySQLにはメタデータとハッシュ化トークンだけが保存されます。',
  'privacy.architecture': 'プライバシー設計',
  'privacy.items': 'ScanSendが保存するもの', 'privacy.noAnalytics': '第三者解析ツールは初期状態で無効です。',
  'help.title': 'ScanSendの使い方', 'help.install': 'PWAをインストール', 'help.android': 'Android：ブラウザメニューから「アプリをインストール」を選びます。',
  'help.fourSteps': '4つの簡単な手順', 'help.httpsTitle': 'HTTPSと端末テスト', 'help.limitationsTitle': 'ブラウザの制限',
  'help.iphone': 'iPhone：共有ボタンから「ホーム画面に追加」を選びます。', 'help.steps': '写真を撮るか選び、有効期限を設定してアップロードし、相手にQRを読み取ってもらいます。',
  'pwa.update': '新しいScanSendを利用できます。', 'pwa.reload': '今すぐ更新', 'pwa.close': 'あとで',
  'common.active': '有効', 'common.expired': '期限切れ', 'common.deleted': '削除済み', 'common.failed': '失敗',
  'common.close': '閉じる', 'common.file': 'ファイル', 'common.error': '問題が発生しました。',
  'common.unavailable': '指定されたページを表示できません。',
}

interface I18nValue { locale: Locale; setLocale: (locale: Locale) => void; t: (key: string, values?: Values) => string }
const I18nContext = createContext<I18nValue | null>(null)

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>(() => navigator.language.toLowerCase().startsWith('ja') ? 'ja' : 'en')
  const value = useMemo<I18nValue>(() => ({
    locale,
    setLocale,
    t: (key, values = {}) => {
      const template = (locale === 'ja' ? ja : en)[key] ?? en[key] ?? key
      return Object.entries(values).reduce((text, [name, replacement]) => text.replaceAll(`{{${name}}}`, String(replacement)), template)
    },
  }), [locale])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

// oxlint-disable-next-line react/only-export-components -- colocating the typed hook with its provider keeps translations private.
export function useI18n(): I18nValue {
  const context = useContext(I18nContext)
  if (!context) throw new Error('useI18n must be used within I18nProvider')
  return context
}
