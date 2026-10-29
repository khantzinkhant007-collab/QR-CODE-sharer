import { Check, Copy, Download, Link2, LoaderCircle, QrCode, Share2, Text } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useI18n } from '../i18n'
import { generatePayloadQr, MAX_QR_BYTES, qrPayload } from '../lib/payloadQr'
import { copyText, dataUrlToFile } from '../lib/share'

export function TextQrPage() {
  const { t } = useI18n()
  const [kind, setKind] = useState<'text' | 'link'>('link')
  const [value, setValue] = useState('')
  const [result, setResult] = useState<{ payload: string; image: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const requestId = useRef(0)
  const downloadLink = useRef<HTMLAnchorElement>(null)
  useEffect(() => () => { requestId.current++ }, [])

  const edit = (nextValue: string, nextKind = kind) => {
    requestId.current++
    setKind(nextKind)
    setValue(nextValue)
    setResult(null)
    setError(null)
    setBusy(false)
    setCopied(false)
  }
  const generate = async () => {
    const current = ++requestId.current
    setBusy(true)
    setError(null)
    setResult(null)
    setCopied(false)
    try {
      const payload = qrPayload(value, kind)
      const image = await generatePayloadQr(payload)
      if (current === requestId.current) setResult({ payload, image })
    } catch (caught) {
      if (current === requestId.current) setError(caught instanceof Error && ['empty', 'invalid_link', 'too_long'].includes(caught.message) ? caught.message : 'failed')
    } finally {
      if (current === requestId.current) setBusy(false)
    }
  }
  const save = () => {
    downloadLink.current?.click()
  }
  const copy = async () => {
    if (!result) return
    const current = requestId.current
    try { await copyText(result.payload); if (current === requestId.current) setCopied(true) } catch { if (current === requestId.current) setError('copy_failed') }
  }
  const share = async () => {
    if (!result) return
    const file = dataUrlToFile(result.image, 'scansend-qr.png')
    try {
      if (navigator.share && navigator.canShare?.({ files: [file] })) await navigator.share({ title: 'ScanSend QR', files: [file] })
      else save()
    } catch (caught) {
      if (!(caught instanceof Error && caught.name === 'AbortError')) setError('share_failed')
    }
  }

  const bytes = new TextEncoder().encode(value).byteLength
  const invalidContent = ['empty', 'invalid_link', 'too_long'].includes(error ?? '')
  return <div className="mx-auto max-w-5xl space-y-7">
    <header><p className="section-kicker"><QrCode size={16} />{t('qr.eyebrow')}</p><h1 className="page-title qr-heading">{t('qr.title')}</h1><p className="page-subtitle">{t('qr.subtitle')}</p></header>
    <p id="qr-notice" className="glass-warning rounded-2xl p-4 text-sm leading-6">{t('qr.notice')}</p>
    <div className="grid items-start gap-6 lg:grid-cols-2">
      <section className="glass-panel min-w-0 p-6 sm:p-8">
        <div role="group" aria-label={t('qr.mode')} className="glass-inset qr-kind mb-6 grid grid-cols-2 gap-2 rounded-full p-1.5">
          <button type="button" aria-pressed={kind === 'link'} className={kind === 'link' ? 'secondary-button' : 'ghost-button'} onClick={() => { if (kind !== 'link') edit(value, 'link') }}><Link2 size={17} />{t('qr.link')}</button>
          <button type="button" aria-pressed={kind === 'text'} className={kind === 'text' ? 'secondary-button' : 'ghost-button'} onClick={() => { if (kind !== 'text') edit(value, 'text') }}><Text size={17} />{t('qr.text')}</button>
        </div>
        <form onSubmit={(event) => { event.preventDefault(); if (!busy) void generate() }}>
          <label htmlFor="qr-content" className="mb-3 block font-semibold">{t(kind === 'link' ? 'qr.linkLabel' : 'qr.textLabel')}</label>
          {kind === 'link' ? <input id="qr-content" maxLength={MAX_QR_BYTES} type="text" inputMode="url" autoCapitalize="none" autoComplete="off" spellCheck={false} className="glass-inset min-h-12 w-full rounded-2xl px-4 py-3" value={value} onChange={(event) => edit(event.target.value)} placeholder="https://example.com" aria-describedby="qr-limit qr-notice" aria-invalid={invalidContent} /> : <textarea id="qr-content" maxLength={MAX_QR_BYTES} rows={7} className="glass-inset w-full resize-y rounded-2xl px-4 py-3" value={value} onChange={(event) => edit(event.target.value)} placeholder={t('qr.placeholder')} aria-describedby="qr-limit qr-notice" aria-invalid={invalidContent} />}
          <p id="qr-limit" className={`mt-3 text-xs ${bytes > MAX_QR_BYTES ? 'text-rose-700 dark:text-rose-200' : 'text-slate-500'}`}>{t('qr.limit', { count: bytes, max: MAX_QR_BYTES })}</p>
          <button type="submit" className="primary-button mt-6 w-full" disabled={busy || !value.trim()}>{busy ? <LoaderCircle className="animate-spin" size={18} /> : <QrCode size={18} />}{t(busy ? 'qr.generating' : 'qr.generate')}</button>
        </form>
        {error && <p role="alert" className="error-box mt-4">{t(`qr.${error}`)}</p>}
      </section>
      <section className="glass-panel min-w-0 p-6 text-center sm:p-8" aria-busy={busy}>
        {result ? <>
          <h2 className="mb-5 text-lg font-semibold">{t('qr.ready')}</h2>
          <div className="mx-auto max-w-xs rounded-3xl bg-white p-3 shadow-lg"><img src={result.image} alt={t('qr.alt')} className="aspect-square w-full" /></div>
          <p className="glass-inset mt-5 max-h-40 overflow-y-auto whitespace-pre-wrap break-all rounded-2xl p-4 text-left text-sm">{result.payload}</p>
          <div className="mt-5 flex flex-wrap justify-center gap-2"><a ref={downloadLink} href={result.image} download="scansend-qr.png" className="secondary-button"><Download size={17} />{t('share.downloadQr')}</a><button type="button" className="secondary-button" onClick={() => void copy()}>{copied ? <Check size={17} /> : <Copy size={17} />}{t(copied ? 'share.copied' : 'qr.copy')}</button><button type="button" className="secondary-button" onClick={() => void share()}><Share2 size={17} />{t('share.shareQr')}</button></div>
        </> : <div className="grid min-h-72 place-items-center content-center gap-4 text-slate-500"><QrCode size={64} strokeWidth={1.1} aria-hidden="true" /><h2 className="text-lg font-semibold">{t('qr.emptyPreview')}</h2><p className="max-w-xs text-sm leading-6">{t('qr.previewHint')}</p></div>}
      </section>
    </div>
  </div>
}
