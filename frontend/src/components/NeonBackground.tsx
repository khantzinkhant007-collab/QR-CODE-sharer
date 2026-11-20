import { useEffect, useMemo, useRef } from 'react'
import { PALETTES, type NeonWallpaperConfig } from '../lib/backgrounds'

export function NeonBackground({ config }: { config: NeonWallpaperConfig }) {
  const { enabled, lightMode, paletteId, isPlaying, speed, intensity, blurLevel } = config

  const orbRefs = useRef<Array<HTMLDivElement | null>>([])
  const ribbonRefs = useRef<Array<HTMLDivElement | null>>([])
  const beamRefs = useRef<Array<HTMLDivElement | null>>([])
  const causticRefs = useRef<Array<HTMLDivElement | null>>([])
  const ringRefs = useRef<Array<HTMLDivElement | null>>([])
  const laserRefs = useRef<Array<HTMLDivElement | null>>([])
  const plasmaRefs = useRef<Array<HTMLDivElement | null>>([])
  const pointerRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 })
  const timeRef = useRef(0)
  const lastFrameRef = useRef<number | null>(null)

  const palette = useMemo(
    () => PALETTES.find((item) => item.id === paletteId) ?? PALETTES[0],
    [paletteId],
  )

  useEffect(() => {
    if (!enabled) return
    const handleMove = (event: PointerEvent) => {
      const nx = (event.clientX / Math.max(1, window.innerWidth) - 0.5) * 2
      const ny = (event.clientY / Math.max(1, window.innerHeight) - 0.5) * 2
      pointerRef.current.targetX = nx * 22
      pointerRef.current.targetY = ny * 22
    }
    window.addEventListener('pointermove', handleMove, { passive: true })
    return () => window.removeEventListener('pointermove', handleMove)
  }, [enabled])

  useEffect(() => {
    if (!enabled) return
    let rafId = 0
    lastFrameRef.current = performance.now()
    const reducedMotion =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const animate = (timestamp: number) => {
      const dt = Math.min(0.05, (timestamp - (lastFrameRef.current ?? timestamp)) / 1000)
      lastFrameRef.current = timestamp

      if (isPlaying && !reducedMotion) {
        timeRef.current += dt * speed
      }

      const pointer = pointerRef.current
      pointer.x += (pointer.targetX - pointer.x) * 0.04
      pointer.y += (pointer.targetY - pointer.y) * 0.04

      const t = timeRef.current

      if (lightMode === 'orbs') {
        palette.orbs.forEach((orb, idx) => {
          const el = orbRefs.current[idx]
          if (!el) return
          const x = orb.baseX + Math.sin(t * orb.freqX + orb.phase) * orb.ampX
          const y = orb.baseY + Math.cos(t * orb.freqY + orb.phase * 0.8) * orb.ampY
          const scale = 1 + Math.sin(t * 0.25 + orb.phase) * 0.1
          const pf = idx % 2 === 0 ? 1 : -0.75
          el.style.left = `${x}%`
          el.style.top = `${y}%`
          el.style.transform = `translate3d(calc(-50% + ${(pointer.x * pf).toFixed(1)}px), calc(-50% + ${(pointer.y * pf).toFixed(1)}px), 0) scale(${scale.toFixed(3)})`
        })
      } else if (lightMode === 'aurora') {
        ;[0, 1, 2].forEach((idx) => {
          const el = ribbonRefs.current[idx]
          if (!el) return
          const dx = Math.sin(t * (0.2 + idx * 0.06) + idx * 1.9) * 14
          const dy = Math.cos(t * (0.16 + idx * 0.05) + idx * 1.3) * 10
          const rot = -14 + idx * 12 + Math.sin(t * 0.18 + idx) * 7
          const sy = 1 + Math.sin(t * 0.24 + idx * 1.1) * 0.18
          el.style.transform = `translate3d(calc(-50% + ${dx.toFixed(1)}% + ${(pointer.x * 0.6).toFixed(1)}px), calc(-50% + ${dy.toFixed(1)}% + ${(pointer.y * 0.4).toFixed(1)}px), 0) rotate(${rot.toFixed(2)}deg) scaleY(${sy.toFixed(3)})`
        })
      } else if (lightMode === 'beams') {
        const baseAngles = [-26, 6, 30]
        ;[0, 1, 2].forEach((idx) => {
          const el = beamRefs.current[idx]
          if (!el) return
          const sweep = Math.sin(t * (0.24 + idx * 0.07) + idx * 2.1) * 15
          const angle = baseAngles[idx] + sweep
          const sx = 1 + Math.cos(t * 0.2 + idx) * 0.14
          el.style.transform = `translate3d(${(pointer.x * 0.4).toFixed(1)}px, 0, 0) rotate(${angle.toFixed(2)}deg) scaleX(${sx.toFixed(3)})`
        })
      } else if (lightMode === 'caustics') {
        const basePositions = [
          { x: 35, y: 38 },
          { x: 64, y: 58 },
          { x: 48, y: 50 },
          { x: 56, y: 32 },
        ]
        ;[0, 1, 2, 3].forEach((idx) => {
          const el = causticRefs.current[idx]
          if (!el) return
          const basePos = basePositions[idx]
          const x = basePos.x + Math.sin(t * (0.22 + idx * 0.05) + idx * 1.5) * 13
          const y = basePos.y + Math.cos(t * (0.19 + idx * 0.04) + idx * 1.2) * 12
          const rot = t * (idx % 2 === 0 ? 12 : -10) + idx * 45
          const sx = 1 + Math.sin(t * 0.3 + idx) * 0.16
          const sy = 1 + Math.cos(t * 0.26 + idx * 1.4) * 0.16
          el.style.left = `${x}%`
          el.style.top = `${y}%`
          el.style.transform = `translate3d(calc(-50% + ${(pointer.x * 0.7).toFixed(1)}px), calc(-50% + ${(pointer.y * 0.7).toFixed(1)}px), 0) rotate(${rot.toFixed(1)}deg) scale(${sx.toFixed(3)}, ${sy.toFixed(3)})`
        })
      } else if (lightMode === 'rings') {
        const basePositions = [
          { x: 30, y: 34 },
          { x: 70, y: 66 },
          { x: 52, y: 48 },
          { x: 68, y: 28 },
        ]
        ;[0, 1, 2, 3].forEach((idx) => {
          const el = ringRefs.current[idx]
          if (!el) return
          const basePos = basePositions[idx]
          const x = basePos.x + Math.sin(t * (0.24 + idx * 0.05) + idx * 1.8) * 12
          const y = basePos.y + Math.cos(t * (0.2 + idx * 0.04) + idx * 1.4) * 10
          const scale = 0.88 + Math.sin(t * (0.35 + idx * 0.08) + idx * 1.6) * 0.22
          const rot = t * (idx % 2 === 0 ? 14 : -11) + idx * 30
          const pf = idx % 2 === 0 ? 0.85 : -0.65
          el.style.left = `${x}%`
          el.style.top = `${y}%`
          el.style.transform = `translate3d(calc(-50% + ${(pointer.x * pf).toFixed(1)}px), calc(-50% + ${(pointer.y * pf).toFixed(1)}px), 0) rotate(${rot.toFixed(1)}deg) scale(${scale.toFixed(3)})`
        })
      } else if (lightMode === 'lasers') {
        ;[0, 1, 2, 3, 4].forEach((idx) => {
          const el = laserRefs.current[idx]
          if (!el) return
          const baseY = 16 + idx * 17
          const yOffset = Math.sin(t * (0.28 + idx * 0.06) + idx * 1.35) * 12
          const rot = -22 + idx * 11 + Math.sin(t * (0.22 + idx * 0.04) + idx) * 9
          const sx = 0.92 + Math.cos(t * 0.3 + idx) * 0.14
          el.style.top = `${baseY + yOffset}%`
          el.style.transform = `translate3d(calc(-50% + ${(pointer.x * 0.5).toFixed(1)}px), calc(-50% + ${(pointer.y * 0.5).toFixed(1)}px), 0) rotate(${rot.toFixed(2)}deg) scaleX(${sx.toFixed(3)})`
        })
      } else if (lightMode === 'plasma') {
        ;[0, 1, 2, 3].forEach((idx) => {
          const el = plasmaRefs.current[idx]
          if (!el) return
          const x = 50 + Math.sin(t * (0.32 + idx * 0.08) + idx * 1.57) * 26
          const y = 50 + Math.cos(t * (0.26 + idx * 0.07) + idx * 1.2) * 22
          const rot = t * (idx % 2 === 0 ? 18 : -15) + idx * 60
          const sx = 1.05 + Math.sin(t * 0.4 + idx) * 0.24
          const sy = 1.05 + Math.cos(t * 0.35 + idx * 1.3) * 0.24
          el.style.left = `${x}%`
          el.style.top = `${y}%`
          el.style.transform = `translate3d(calc(-50% + ${(pointer.x * 0.9).toFixed(1)}px), calc(-50% + ${(pointer.y * 0.9).toFixed(1)}px), 0) rotate(${rot.toFixed(1)}deg) scale(${sx.toFixed(3)}, ${sy.toFixed(3)})`
        })
      }

      if (isPlaying && !reducedMotion) {
        rafId = requestAnimationFrame(animate)
      }
    }

    rafId = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(rafId)
  }, [enabled, isPlaying, speed, palette, lightMode])

  if (!enabled) return null

  return (
    <div
      className="neon-wallpaper pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-black"
      aria-hidden="true"
      data-testid="neon-background"
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {/* 1. Neon Pulse Rings */}
        {lightMode === 'rings' &&
          [0, 1, 2, 3].map((idx) => {
            const hex = palette.hex[idx % palette.hex.length]
            const size = 26 + idx * 10
            return (
              <div
                key={`ring-${palette.id}-${idx}`}
                ref={(el) => {
                  ringRefs.current[idx] = el
                }}
                style={{
                  position: 'absolute',
                  left: '50%',
                  top: '50%',
                  width: `${size}vmax`,
                  height: `${size}vmax`,
                  borderRadius: idx % 2 === 0 ? '50%' : '44% 56% 52% 48% / 48% 44% 56% 52%',
                  border: `2.5px solid ${hex}`,
                  boxShadow: `0 0 14px ${hex}, 0 0 42px ${hex}, inset 0 0 28px ${hex}`,
                  filter: `blur(${Math.max(1, (blurLevel - 50) * 0.08)}px)`,
                  opacity: intensity,
                  mixBlendMode: 'screen',
                  transform: 'translate3d(-50%, -50%, 0)',
                  willChange: 'transform, left, top',
                }}
              />
            )
          })}

        {/* 2. Neon Laser Lines */}
        {lightMode === 'lasers' &&
          [0, 1, 2, 3, 4].map((idx) => {
            const hex = palette.hex[idx % palette.hex.length]
            return (
              <div
                key={`laser-${palette.id}-${idx}`}
                ref={(el) => {
                  laserRefs.current[idx] = el
                }}
                style={{
                  position: 'absolute',
                  left: '50%',
                  top: `${16 + idx * 17}%`,
                  width: '145vmax',
                  height: idx % 2 === 0 ? '3px' : '2px',
                  borderRadius: '999px',
                  background: `linear-gradient(90deg, rgba(0,0,0,0) 0%, ${hex} 22%, #ffffff 50%, ${hex} 78%, rgba(0,0,0,0) 100%)`,
                  boxShadow: `0 0 14px ${hex}, 0 0 38px ${hex}, 0 0 84px ${hex}`,
                  filter: `blur(${Math.max(0.5, (blurLevel - 50) * 0.05)}px)`,
                  opacity: intensity,
                  mixBlendMode: 'screen',
                  transform: 'translate3d(-50%, -50%, 0)',
                  willChange: 'transform, top',
                }}
              />
            )
          })}

        {/* 3. Cyber Neon Plasma */}
        {lightMode === 'plasma' &&
          [0, 1, 2, 3].map((idx) => {
            const c1 = palette.colors[idx % palette.colors.length]
            const c2 = palette.colors[(idx + 1) % palette.colors.length]
            return (
              <div
                key={`plasma-${palette.id}-${idx}`}
                ref={(el) => {
                  plasmaRefs.current[idx] = el
                }}
                style={{
                  position: 'absolute',
                  left: '50%',
                  top: '50%',
                  width: `${40 + idx * 8}vmax`,
                  height: `${30 + idx * 7}vmax`,
                  borderRadius: '38% 62% 55% 45% / 52% 36% 64% 48%',
                  background: `radial-gradient(circle at 30% 30%, #ffffff 0%, ${c1} 28%, ${c2} 58%, rgba(0,0,0,0) 78%)`,
                  filter: `blur(${Math.max(38, blurLevel * 0.72)}px) saturate(160%)`,
                  opacity: intensity,
                  mixBlendMode: 'screen',
                  transform: 'translate3d(-50%, -50%, 0)',
                  willChange: 'transform, left, top',
                }}
              />
            )
          })}

        {/* 4. Ambient Orbs */}
        {lightMode === 'orbs' &&
          palette.orbs.map((orb, idx) => (
            <div
              key={`orb-${palette.id}-${orb.id}`}
              ref={(el) => {
                orbRefs.current[idx] = el
              }}
              style={{
                position: 'absolute',
                left: `${orb.baseX}%`,
                top: `${orb.baseY}%`,
                width: `${orb.size}vmax`,
                height: `${orb.size}vmax`,
                borderRadius: '50%',
                background: `radial-gradient(circle, ${orb.color} 0%, rgba(0, 0, 0, 0) 70%)`,
                filter: `blur(${blurLevel}px)`,
                opacity: intensity,
                transform: 'translate3d(-50%, -50%, 0)',
                willChange: 'transform, left, top',
              }}
            />
          ))}

        {/* 5. Aurora Ribbons */}
        {lightMode === 'aurora' &&
          [0, 1, 2].map((idx) => (
            <div
              key={`ribbon-${palette.id}-${idx}`}
              ref={(el) => {
                ribbonRefs.current[idx] = el
              }}
              style={{
                position: 'absolute',
                left: '50%',
                top: `${32 + idx * 18}%`,
                width: '130vmax',
                height: `${28 + idx * 6}vmax`,
                borderRadius: '46%',
                background: `linear-gradient(90deg, rgba(0,0,0,0) 0%, ${palette.colors[idx]} 32%, ${palette.colors[(idx + 1) % palette.colors.length]} 68%, rgba(0,0,0,0) 100%)`,
                filter: `blur(${Math.max(48, blurLevel * 0.85)}px)`,
                opacity: intensity * 0.9,
                mixBlendMode: 'screen',
                transform: 'translate3d(-50%, -50%, 0)',
                willChange: 'transform',
              }}
            />
          ))}

        {/* 6. Spotlight Beams */}
        {lightMode === 'beams' &&
          [0, 1, 2].map((idx) => (
            <div
              key={`beam-${palette.id}-${idx}`}
              ref={(el) => {
                beamRefs.current[idx] = el
              }}
              style={{
                position: 'absolute',
                left: `${16 + idx * 30}%`,
                top: '-22%',
                width: '40vmax',
                height: '135vmax',
                transformOrigin: '50% 0%',
                background: `conic-gradient(from 162deg at 50% 0%, rgba(0,0,0,0) 0deg, ${palette.colors[idx]} 18deg, rgba(0,0,0,0) 36deg)`,
                filter: `blur(${Math.max(36, blurLevel * 0.6)}px)`,
                opacity: intensity * 0.95,
                mixBlendMode: 'screen',
                willChange: 'transform',
              }}
            />
          ))}

        {/* 7. Liquid Caustics */}
        {lightMode === 'caustics' &&
          [0, 1, 2, 3].map((idx) => (
            <div
              key={`caustic-${palette.id}-${idx}`}
              ref={(el) => {
                causticRefs.current[idx] = el
              }}
              style={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                width: `${44 + idx * 9}vmax`,
                height: `${34 + idx * 7}vmax`,
                borderRadius: '42% 58% 63% 37% / 44% 39% 61% 56%',
                background: `radial-gradient(ellipse at center, rgba(0,0,0,0) 44%, ${palette.colors[idx % palette.colors.length]} 63%, rgba(0,0,0,0) 76%)`,
                filter: `blur(${Math.max(22, blurLevel * 0.38)}px)`,
                opacity: intensity,
                mixBlendMode: 'screen',
                transform: 'translate3d(-50%, -50%, 0)',
                willChange: 'transform, left, top',
              }}
            />
          ))}
      </div>

      {/* Subtle Vignette to keep edges deep OLED black */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at center, rgba(0,0,0,0) 35%, rgba(0,0,0,0.62) 100%)',
        }}
      />
    </div>
  )
}
