import {
  Check,
  Circle,
  Disc,
  Flame,
  Grid,
  Hexagon,
  Image,
  Pause,
  Play,
  Radio,
  Sparkles,
  Stars,
  Sun,
  Waves,
  X,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { useI18n } from '../i18n'
import { backgrounds, type BackgroundId } from '../lib/backgrounds'
import {
  LIGHT_MODES,
  PALETTES,
  TEXTURE_MODES,
  type LightModeId,
  type NeonSettings,
} from '../lib/neonWallpaper'

const LIGHT_MODE_ICONS: Record<LightModeId, LucideIcon> = {
  prisms: Hexagon,
  grid3d: Grid,
  starfield: Stars,
  rings: Radio,
  lasers: Zap,
  plasma: Flame,
  orbs: Circle,
  aurora: Waves,
  beams: Sun,
  caustics: Disc,
}

function BackgroundDialog({
  value,
  onChange,
  neonSettings,
  onNeonSettingsChange,
  onClose,
  saved,
}: {
  value: BackgroundId
  onChange: (value: BackgroundId) => void
  neonSettings: NeonSettings
  onNeonSettingsChange: (next: NeonSettings) => void
  onClose: () => void
  saved: boolean
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const descriptionId = useId()
  const groupName = useId()
  const { t } = useI18n()

  useEffect(() => {
    const element = dialog.current
    element?.showModal()
    return () => element?.close()
  }, [])

  const activePalette = PALETTES.find((item) => item.id === neonSettings.paletteId) ?? PALETTES[0]
  const activeMode = LIGHT_MODES.find((item) => item.id === neonSettings.lightMode) ?? LIGHT_MODES[0]

  return (
    <dialog
      ref={dialog}
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      className="glass-panel confirm-dialog background-dialog fixed inset-0 m-auto text-white"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="section-kicker">
            <Image size={15} aria-hidden="true" />
            {t('backgrounds.eyebrow')}
          </p>
          <h2 id={titleId} className="text-2xl font-semibold tracking-tight text-white">
            {t('backgrounds.title')}
          </h2>
        </div>
        <button
          autoFocus
          type="button"
          className="icon-button"
          onClick={onClose}
          aria-label={t('common.close')}
        >
          <X size={20} />
        </button>
      </div>
      <p id={descriptionId} className="mt-3 text-sm leading-6 text-slate-300">
        {t('backgrounds.description')}
      </p>

      <fieldset className="background-fieldset mt-5 border-0 p-0">
        <legend className="sr-only">{t('backgrounds.title')}</legend>
        <div className="grid grid-cols-2 gap-3">
          {/* Live Neon radio option at the top of the grid */}
          <label className="background-choice col-span-2">
            <input
              type="radio"
              name={groupName}
              value="neon"
              checked={value === 'neon'}
              onChange={() => onChange('neon')}
              className="sr-only"
            />
            <span className="background-card">
              <span
                className="neon-preview-thumb"
                aria-hidden="true"
                style={{
                  background: `radial-gradient(circle at 22% 30%, ${activePalette.colors[0]} 0%, transparent 55%), radial-gradient(circle at 78% 70%, ${activePalette.colors[1]} 0%, transparent 58%), radial-gradient(circle at 52% 48%, ${activePalette.colors[2]} 0%, transparent 62%), #000000`,
                }}
              >
                <span className="neon-preview-badge">
                  <Sparkles size={13} aria-hidden="true" />
                  <span>{activeMode.fullName}</span>
                  <span aria-hidden="true">·</span>
                  <span>{activePalette.name}</span>
                </span>
              </span>
              <span className="background-card-caption">
                <span>{t('backgrounds.neon')}</span>
                <span className="background-check" aria-hidden="true">
                  {value === 'neon' && <Check size={14} />}
                </span>
              </span>
            </span>
          </label>

          {/* 8 classic photo backdrop cards */}
          {backgrounds.map((background) => (
            <label key={background.id} className="background-choice">
              <input
                type="radio"
                name={groupName}
                value={background.id}
                checked={value === background.id}
                onChange={() => onChange(background.id)}
                className="sr-only"
              />
              <span className="background-card">
                <img
                  src={background.thumbnail}
                  alt=""
                  width={400}
                  height={225}
                  className="background-thumbnail"
                />
                <span className="background-card-caption">
                  <span>{t(`backgrounds.${background.id}`)}</span>
                  <span className="background-check" aria-hidden="true">
                    {value === background.id && <Check size={14} />}
                  </span>
                </span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      {/* Neon Studio Controls when Live Neon is active */}
      {value === 'neon' && (
        <section className="glass-soft neon-controls mt-6 space-y-5 rounded-2xl p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold tracking-wider text-sky-300 uppercase">
                <Sparkles size={14} aria-hidden="true" />
                <span>{t('backgrounds.neonTitle')}</span>
              </div>
              <p className="mt-1 text-xs text-slate-300">
                {activeMode.fullName} · {activePalette.name}
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                onNeonSettingsChange({
                  ...neonSettings,
                  isPlaying: !neonSettings.isPlaying,
                })
              }
              aria-pressed={neonSettings.isPlaying}
              className="secondary-button min-h-9 px-3.5 py-1.5 text-xs"
            >
              {neonSettings.isPlaying ? (
                <Pause size={14} aria-hidden="true" />
              ) : (
                <Play size={14} aria-hidden="true" />
              )}
              <span>
                {neonSettings.isPlaying
                  ? t('backgrounds.neonPause')
                  : t('backgrounds.neonPlay')}
              </span>
            </button>
          </div>

          {/* 10-Way Light Mode Switcher */}
          <div>
            <p className="mb-2 text-xs font-medium text-slate-300">
              {t('backgrounds.neonStyle')}
            </p>
            <div
              role="group"
              aria-label={t('backgrounds.neonStyle')}
              className="flex flex-wrap gap-1.5"
            >
              {LIGHT_MODES.map((mode) => {
                const Icon = LIGHT_MODE_ICONS[mode.id]
                const active = mode.id === neonSettings.lightMode
                return (
                  <button
                    key={mode.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() =>
                      onNeonSettingsChange({
                        ...neonSettings,
                        lightMode: mode.id,
                      })
                    }
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                      active
                        ? 'border-white/35 bg-white/20 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.4)]'
                        : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/15 hover:text-white'
                    }`}
                  >
                    <Icon size={14} aria-hidden="true" />
                    <span>{mode.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* 7-Way Color Palette Picker */}
          <div>
            <p className="mb-2 text-xs font-medium text-slate-300">
              {t('backgrounds.neonPalette')}
            </p>
            <div
              role="group"
              aria-label={t('backgrounds.neonPalette')}
              className="flex flex-wrap items-center gap-2.5"
            >
              {PALETTES.map((palette) => {
                const active = palette.id === neonSettings.paletteId
                return (
                  <button
                    key={palette.id}
                    type="button"
                    title={palette.name}
                    aria-label={t('backgrounds.selectPalette', { name: palette.name })}
                    aria-pressed={active}
                    onClick={() =>
                      onNeonSettingsChange({
                        ...neonSettings,
                        paletteId: palette.id,
                      })
                    }
                    className={`h-7 w-7 rounded-full transition ${
                      active
                        ? 'scale-110 ring-2 ring-white ring-offset-2 ring-offset-black/70'
                        : 'opacity-75 hover:opacity-100'
                    }`}
                    style={{ background: palette.swatch }}
                  />
                )
              })}
            </div>
          </div>

          {/* 4-Way Surface Texture Picker */}
          <div>
            <p className="mb-2 text-xs font-medium text-slate-300">
              {t('backgrounds.neonTexture')}
            </p>
            <div
              role="group"
              aria-label={t('backgrounds.neonTexture')}
              className="flex flex-wrap gap-1.5"
            >
              {TEXTURE_MODES.map((texture) => {
                const active = texture.id === neonSettings.textureMode
                return (
                  <button
                    key={texture.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() =>
                      onNeonSettingsChange({
                        ...neonSettings,
                        textureMode: texture.id,
                      })
                    }
                    className={`inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                      active
                        ? 'border-white/35 bg-white/20 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.4)]'
                        : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/15 hover:text-white'
                    }`}
                  >
                    {texture.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Motion & Glow Sliders */}
          <div className="grid gap-3.5 sm:grid-cols-3">
            <label className="block">
              <span className="mb-1.5 flex justify-between gap-2 text-xs">
                <span className="text-slate-300">{t('backgrounds.neonSpeed')}</span>
                <span className="font-mono text-sky-200 tabular-nums">
                  {neonSettings.speed.toFixed(2)}x
                </span>
              </span>
              <input
                type="range"
                aria-label={t('backgrounds.neonSpeed')}
                min={0.15}
                max={2.0}
                step={0.05}
                value={neonSettings.speed}
                onChange={(event) =>
                  onNeonSettingsChange({
                    ...neonSettings,
                    speed: Number(event.target.value),
                  })
                }
                className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/20 accent-sky-300"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 flex justify-between gap-2 text-xs">
                <span className="text-slate-300">{t('backgrounds.neonIntensity')}</span>
                <span className="font-mono text-sky-200 tabular-nums">
                  {Math.round(neonSettings.intensity * 100)}%
                </span>
              </span>
              <input
                type="range"
                aria-label={t('backgrounds.neonIntensity')}
                min={0.25}
                max={1.0}
                step={0.05}
                value={neonSettings.intensity}
                onChange={(event) =>
                  onNeonSettingsChange({
                    ...neonSettings,
                    intensity: Number(event.target.value),
                  })
                }
                className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/20 accent-sky-300"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 flex justify-between gap-2 text-xs">
                <span className="text-slate-300">{t('backgrounds.neonBlur')}</span>
                <span className="font-mono text-sky-200 tabular-nums">
                  {neonSettings.blurLevel}px
                </span>
              </span>
              <input
                type="range"
                aria-label={t('backgrounds.neonBlur')}
                min={50}
                max={160}
                step={5}
                value={neonSettings.blurLevel}
                onChange={(event) =>
                  onNeonSettingsChange({
                    ...neonSettings,
                    blurLevel: Number(event.target.value),
                  })
                }
                className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/20 accent-sky-300"
              />
            </label>
          </div>
        </section>
      )}

      <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
        <p role="status" className="max-w-xs text-xs leading-5 text-slate-400">
          {t(saved ? 'backgrounds.saved' : 'backgrounds.sessionOnly')}
        </p>
        <button type="button" className="primary-button" onClick={onClose}>
          {t('backgrounds.done')}
        </button>
      </div>
    </dialog>
  )
}

export function BackgroundPicker({
  value,
  onChange,
  neonSettings,
  onNeonSettingsChange,
  saved,
}: {
  value: BackgroundId
  onChange: (value: BackgroundId) => void
  neonSettings: NeonSettings
  onNeonSettingsChange: (next: NeonSettings) => void
  saved: boolean
}) {
  const [open, setOpen] = useState(false)
  const { t } = useI18n()
  return (
    <>
      <button
        type="button"
        className="icon-button"
        onClick={() => setOpen(true)}
        aria-label={t('backgrounds.open')}
        title={t('backgrounds.open')}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <Image size={18} />
      </button>
      {open && (
        <BackgroundDialog
          value={value}
          onChange={onChange}
          neonSettings={neonSettings}
          onNeonSettingsChange={onNeonSettingsChange}
          saved={saved}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  )
}
