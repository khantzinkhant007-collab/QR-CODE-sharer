import { memo, useEffect, useMemo, useRef, type CSSProperties } from 'react'
import {
  BOKEH_PARTICLES,
  PALETTES,
  PRISM_SHAPES,
  type NeonSettings,
  type PrismShape,
  type TextureModeId,
} from '../lib/neonWallpaper'

const FRAME_INTERVAL_MS = 1000 / 30

const CAUSTIC_BASE_POSITIONS = [
  { x: 35, y: 38 },
  { x: 64, y: 58 },
  { x: 48, y: 50 },
  { x: 56, y: 32 },
] as const

const RING_BASE_POSITIONS = [
  { x: 30, y: 34 },
  { x: 70, y: 66 },
  { x: 52, y: 48 },
  { x: 68, y: 28 },
] as const

function getPrismPolygonPoints(kind: PrismShape['kind']): string {
  switch (kind) {
    case 'hexagon':
      return '50,4 92,27 92,73 50,96 8,73 8,27'
    case 'diamond':
      return '50,4 94,50 50,96 6,50'
    case 'triangle':
      return '50,6 94,88 6,88'
    case 'square':
      return '14,14 86,14 86,86 14,86'
  }
}

function getTextureStyle(textureMode: TextureModeId): CSSProperties | null {
  switch (textureMode) {
    case 'clean':
      return null
    case 'dots':
      return {
        backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.12) 1px, transparent 1px)',
        backgroundSize: '24px 24px',
        opacity: 0.34,
      }
    case 'scanlines':
      return {
        backgroundImage:
          'repeating-linear-gradient(0deg, rgba(255, 255, 255, 0.06) 0px, rgba(255, 255, 255, 0.06) 1px, transparent 1px, transparent 4px)',
        opacity: 0.42,
      }
    case 'mesh':
      return {
        backgroundImage:
          'linear-gradient(rgba(255, 255, 255, 0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.06) 1px, transparent 1px)',
        backgroundSize: '44px 44px',
        opacity: 0.38,
      }
  }
}

export const NeonWallpaper = memo(function NeonWallpaper({ settings }: { settings: NeonSettings }) {
  const { lightMode, paletteId, textureMode, isPlaying, speed, intensity, blurLevel } = settings

  const prismRefs = useRef<Array<HTMLDivElement | null>>([])
  const gridPlaneRef = useRef<HTMLDivElement | null>(null)
  const gridHorizonRef = useRef<HTMLDivElement | null>(null)
  const starRefs = useRef<Array<HTMLDivElement | null>>([])
  const orbRefs = useRef<Array<HTMLDivElement | null>>([])
  const ribbonRefs = useRef<Array<HTMLDivElement | null>>([])
  const beamRefs = useRef<Array<HTMLDivElement | null>>([])
  const causticRefs = useRef<Array<HTMLDivElement | null>>([])
  const ringRefs = useRef<Array<HTMLDivElement | null>>([])
  const laserRefs = useRef<Array<HTMLDivElement | null>>([])
  const plasmaRefs = useRef<Array<HTMLDivElement | null>>([])

  const pointerRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 })
  const timeRef = useRef(0)
  const speedRef = useRef(speed)
  speedRef.current = speed

  const palette = useMemo(
    () => PALETTES.find((item) => item.id === paletteId) ?? PALETTES[0],
    [paletteId],
  )

  const textureStyle = useMemo(() => getTextureStyle(textureMode), [textureMode])

  const softBlurPx = Math.min(36, Math.max(16, blurLevel * 0.32))
  const backingAuraBlurPx = Math.min(48, Math.max(24, blurLevel * 0.4))
  const gridHorizonBlurPx = Math.min(44, Math.max(22, blurLevel * 0.42))
  const ringFilter =
    blurLevel > 55 ? `blur(${Math.min(6, (blurLevel - 55) * 0.05).toFixed(1)}px)` : undefined
  const laserFilter =
    blurLevel > 55 ? `blur(${Math.min(4, (blurLevel - 55) * 0.035).toFixed(1)}px)` : undefined

  useEffect(() => {
    const handleMove = (event: PointerEvent) => {
      const nx = (event.clientX / Math.max(1, window.innerWidth) - 0.5) * 2
      const ny = (event.clientY / Math.max(1, window.innerHeight) - 0.5) * 2
      pointerRef.current.targetX = nx * 22
      pointerRef.current.targetY = ny * 22
    }
    window.addEventListener('pointermove', handleMove, { passive: true })
    return () => window.removeEventListener('pointermove', handleMove)
  }, [])

  useEffect(() => {
    let rafId = 0
    let lastDrawTime = 0
    let lastTickTime = performance.now()
    const reducedMotion =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const shouldRun = isPlaying && !reducedMotion

    const drawFrame = (timestamp: number, force = false) => {
      if (!force && timestamp - lastDrawTime < Math.min(32, FRAME_INTERVAL_MS)) {
        if (shouldRun && !document.hidden) {
          rafId = requestAnimationFrame(onFrame)
        }
        return
      }

      const dt = Math.min(0.1, Math.max(0, (timestamp - lastTickTime) / 1000))
      lastTickTime = timestamp
      lastDrawTime = timestamp

      if (shouldRun) {
        timeRef.current += dt * speedRef.current
      }

      const pointer = pointerRef.current
      if (!reducedMotion) {
        const lerp = Math.min(0.2, dt * 2.5)
        pointer.x += (pointer.targetX - pointer.x) * lerp
        pointer.y += (pointer.targetY - pointer.y) * lerp
      }

      const t = timeRef.current

      if (lightMode === 'prisms') {
        PRISM_SHAPES.forEach((shape, idx) => {
          const el = prismRefs.current[idx]
          if (!el) return
          const dx = Math.sin(t * shape.freqX + shape.phase) * shape.ampX
          const dy = Math.cos(t * shape.freqY + shape.phase * 0.8) * shape.ampY
          const rotZ = t * shape.rotSpeed + shape.phase * 24
          const rotX = Math.sin(t * shape.tiltSpeed + shape.phase) * 28
          const rotY = Math.cos(t * shape.tiltSpeed * 0.85 + shape.phase) * 32
          const scale = 0.94 + Math.sin(t * 0.28 + shape.phase) * 0.1
          const pf = idx % 2 === 0 ? 0.9 : -0.7
          el.style.transform = `translate3d(calc(-50% + ${dx.toFixed(2)}vw + ${(pointer.x * pf).toFixed(1)}px), calc(-50% + ${dy.toFixed(2)}vh + ${(pointer.y * pf).toFixed(1)}px), 0) perspective(700px) rotateX(${rotX.toFixed(1)}deg) rotateY(${rotY.toFixed(1)}deg) rotateZ(${rotZ.toFixed(1)}deg) scale(${scale.toFixed(3)})`
        })
      } else if (lightMode === 'grid3d') {
        const plane = gridPlaneRef.current
        if (plane) {
          const scrollOffset = (t * 48) % 64
          const tiltX = 68 + pointer.y * 0.14
          const shiftX = pointer.x * 0.7
          plane.style.transform = `translate3d(calc(-50% + ${shiftX.toFixed(1)}px), 0, 0) perspective(560px) rotateX(${tiltX.toFixed(2)}deg) translateY(${scrollOffset.toFixed(1)}px)`
        }
        const horizon = gridHorizonRef.current
        if (horizon) {
          const pulse = 1 + Math.sin(t * 0.45) * 0.08
          horizon.style.transform = `translate3d(calc(-50% + ${(pointer.x * 0.35).toFixed(1)}px), calc(-50% + ${(pointer.y * 0.2).toFixed(1)}px), 0) scale(${pulse.toFixed(3)})`
        }
      } else if (lightMode === 'starfield') {
        BOKEH_PARTICLES.forEach((particle, idx) => {
          const el = starRefs.current[idx]
          if (!el) return
          const driftY = ((particle.baseY - ((t * particle.speed * 14) % 116) + 116) % 116) - 8
          const driftX = Math.sin(t * particle.speed + particle.phase) * 4.5
          const scale = 0.8 + Math.sin(t * (0.6 + particle.speed) + particle.phase) * 0.26
          const pf = particle.depth * 1.1
          el.style.transform = `translate3d(calc(-50% + ${driftX.toFixed(2)}vw + ${(pointer.x * pf).toFixed(1)}px), calc(-50% + ${driftY.toFixed(2)}vh + ${(pointer.y * pf).toFixed(1)}px), 0) scale(${scale.toFixed(3)})`
        })
      } else if (lightMode === 'orbs') {
        palette.orbs.forEach((orb, idx) => {
          const el = orbRefs.current[idx]
          if (!el) return
          const dx = Math.sin(t * orb.freqX + orb.phase) * orb.ampX
          const dy = Math.cos(t * orb.freqY + orb.phase * 0.8) * orb.ampY
          const scale = 1 + Math.sin(t * 0.25 + orb.phase) * 0.1
          const pf = idx % 2 === 0 ? 1 : -0.75
          el.style.transform = `translate3d(calc(-50% + ${dx.toFixed(2)}vw + ${(pointer.x * pf).toFixed(1)}px), calc(-50% + ${dy.toFixed(2)}vh + ${(pointer.y * pf).toFixed(1)}px), 0) scale(${scale.toFixed(3)})`
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
        ;[0, 1, 2, 3].forEach((idx) => {
          const el = causticRefs.current[idx]
          if (!el) return
          const dx = Math.sin(t * (0.22 + idx * 0.05) + idx * 1.5) * 13
          const dy = Math.cos(t * (0.19 + idx * 0.04) + idx * 1.2) * 12
          const rot = t * (idx % 2 === 0 ? 12 : -10) + idx * 45
          const sx = 1 + Math.sin(t * 0.3 + idx) * 0.16
          const sy = 1 + Math.cos(t * 0.26 + idx * 1.4) * 0.16
          el.style.transform = `translate3d(calc(-50% + ${dx.toFixed(2)}vw + ${(pointer.x * 0.7).toFixed(1)}px), calc(-50% + ${dy.toFixed(2)}vh + ${(pointer.y * 0.7).toFixed(1)}px), 0) rotate(${rot.toFixed(1)}deg) scale(${sx.toFixed(3)}, ${sy.toFixed(3)})`
        })
      } else if (lightMode === 'rings') {
        ;[0, 1, 2, 3].forEach((idx) => {
          const el = ringRefs.current[idx]
          if (!el) return
          const dx = Math.sin(t * (0.24 + idx * 0.05) + idx * 1.8) * 12
          const dy = Math.cos(t * (0.2 + idx * 0.04) + idx * 1.4) * 10
          const scale = 0.88 + Math.sin(t * (0.35 + idx * 0.08) + idx * 1.6) * 0.22
          const rot = t * (idx % 2 === 0 ? 14 : -11) + idx * 30
          const pf = idx % 2 === 0 ? 0.85 : -0.65
          el.style.transform = `translate3d(calc(-50% + ${dx.toFixed(2)}vw + ${(pointer.x * pf).toFixed(1)}px), calc(-50% + ${dy.toFixed(2)}vh + ${(pointer.y * pf).toFixed(1)}px), 0) rotate(${rot.toFixed(1)}deg) scale(${scale.toFixed(3)})`
        })
      } else if (lightMode === 'lasers') {
        ;[0, 1, 2, 3, 4].forEach((idx) => {
          const el = laserRefs.current[idx]
          if (!el) return
          const yOffset = Math.sin(t * (0.28 + idx * 0.06) + idx * 1.35) * 12
          const rot = -22 + idx * 11 + Math.sin(t * (0.22 + idx * 0.04) + idx) * 9
          const sx = 0.92 + Math.cos(t * 0.3 + idx) * 0.14
          el.style.transform = `translate3d(calc(-50% + ${(pointer.x * 0.5).toFixed(1)}px), calc(-50% + ${yOffset.toFixed(2)}vh + ${(pointer.y * 0.5).toFixed(1)}px), 0) rotate(${rot.toFixed(2)}deg) scaleX(${sx.toFixed(3)})`
        })
      } else if (lightMode === 'plasma') {
        ;[0, 1, 2, 3].forEach((idx) => {
          const el = plasmaRefs.current[idx]
          if (!el) return
          const dx = Math.sin(t * (0.32 + idx * 0.08) + idx * 1.57) * 26
          const dy = Math.cos(t * (0.26 + idx * 0.07) + idx * 1.2) * 22
          const rot = t * (idx % 2 === 0 ? 18 : -15) + idx * 60
          const sx = 1.05 + Math.sin(t * 0.4 + idx) * 0.24
          const sy = 1.05 + Math.cos(t * 0.35 + idx * 1.3) * 0.24
          el.style.transform = `translate3d(calc(-50% + ${dx.toFixed(2)}vw + ${(pointer.x * 0.9).toFixed(1)}px), calc(-50% + ${dy.toFixed(2)}vh + ${(pointer.y * 0.9).toFixed(1)}px), 0) rotate(${rot.toFixed(1)}deg) scale(${sx.toFixed(3)}, ${sy.toFixed(3)})`
        })
      }

      if (shouldRun && !document.hidden) {
        rafId = requestAnimationFrame(onFrame)
      }
    }

    const onFrame = (timestamp: number) => {
      drawFrame(timestamp, false)
    }

    const handleVisibilityChange = () => {
      if (document.hidden) {
        cancelAnimationFrame(rafId)
        rafId = 0
      } else if (shouldRun && rafId === 0) {
        lastTickTime = performance.now()
        lastDrawTime = 0
        rafId = requestAnimationFrame(onFrame)
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    rafId = requestAnimationFrame((ts) => drawFrame(ts, true))

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      cancelAnimationFrame(rafId)
    }
  }, [isPlaying, palette, lightMode])

  return (
    <div
      className="neon-wallpaper fixed inset-0 -z-10 overflow-hidden bg-black pointer-events-none select-none"
      style={{ contain: 'strict' }}
      aria-hidden="true"
      data-testid="neon-wallpaper"
      data-light-mode={lightMode}
      data-palette={palette.id}
      data-texture={textureMode}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {/* 1. 3D Neon Prisms */}
        {lightMode === 'prisms' && (
          <>
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: `radial-gradient(circle at 26% 32%, ${palette.colors[0]} 0%, rgba(0,0,0,0) 48%), radial-gradient(circle at 74% 68%, ${palette.colors[1]} 0%, rgba(0,0,0,0) 50%)`,
                filter: `blur(${backingAuraBlurPx}px)`,
                opacity: intensity * 0.38,
              }}
            />
            {PRISM_SHAPES.map((shape, idx) => {
              const hex = palette.hex[shape.colorIdx % palette.hex.length]
              return (
                <div
                  key={`prism-${palette.id}-${shape.id}`}
                  ref={(el) => {
                    prismRefs.current[idx] = el
                  }}
                  style={{
                    position: 'absolute',
                    left: `${shape.baseX}%`,
                    top: `${shape.baseY}%`,
                    width: `${shape.size}vmax`,
                    height: `${shape.size}vmax`,
                    opacity: intensity,
                    mixBlendMode: 'screen',
                    transform: 'translate3d(-50%, -50%, 0)',
                    willChange: 'transform',
                  }}
                >
                  <svg viewBox="0 0 100 100" className="h-full w-full overflow-visible">
                    <polygon
                      points={getPrismPolygonPoints(shape.kind)}
                      fill="none"
                      stroke={hex}
                      strokeOpacity="0.26"
                      strokeWidth="8"
                      strokeLinejoin="round"
                    />
                    <polygon
                      points={getPrismPolygonPoints(shape.kind)}
                      fill="none"
                      stroke={hex}
                      strokeWidth="2.4"
                      strokeLinejoin="round"
                    />
                    <polygon
                      points={getPrismPolygonPoints(shape.kind)}
                      fill={palette.colors[shape.colorIdx % palette.colors.length]}
                      fillOpacity="0.14"
                      stroke="#ffffff"
                      strokeOpacity="0.5"
                      strokeWidth="0.9"
                      strokeLinejoin="round"
                      transform="translate(50 50) scale(0.76) translate(-50 -50)"
                    />
                  </svg>
                </div>
              )
            })}
          </>
        )}

        {/* 2. 3D Cyber Grid */}
        {lightMode === 'grid3d' && (
          <>
            <div
              ref={gridHorizonRef}
              style={{
                position: 'absolute',
                left: '50%',
                top: '44%',
                width: '72vmax',
                height: '36vmax',
                borderRadius: '50%',
                background: `radial-gradient(circle, ${palette.colors[0]} 0%, ${palette.colors[1]} 36%, rgba(0,0,0,0) 72%)`,
                filter: `blur(${gridHorizonBlurPx}px)`,
                opacity: intensity * 0.92,
                mixBlendMode: 'screen',
                transform: 'translate3d(-50%, -50%, 0)',
                willChange: 'transform',
              }}
            />
            <div
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                top: '46%',
                height: '2px',
                background: `linear-gradient(90deg, rgba(0,0,0,0) 0%, ${palette.hex[0]} 25%, #ffffff 50%, ${palette.hex[1]} 75%, rgba(0,0,0,0) 100%)`,
                boxShadow: `0 0 14px ${palette.hex[0]}, 0 0 32px ${palette.hex[1]}`,
                opacity: intensity,
              }}
            />
            <div
              ref={gridPlaneRef}
              style={{
                position: 'absolute',
                left: '50%',
                top: 'calc(45% - 64px)',
                width: '190vmax',
                height: '120vmax',
                transformOrigin: '50% 0%',
                transform: 'translate3d(-50%, 0, 0) perspective(560px) rotateX(68deg)',
                backgroundImage: `linear-gradient(to right, ${palette.hex[1]} 1.5px, transparent 1.5px), linear-gradient(to bottom, ${palette.hex[0]} 1.5px, transparent 1.5px)`,
                backgroundSize: '64px 64px',
                opacity: intensity * 0.78,
                mixBlendMode: 'screen',
                maskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.05) 0%, rgba(0,0,0,1) 28%, rgba(0,0,0,0.85) 100%)',
                WebkitMaskImage:
                  'linear-gradient(to bottom, rgba(0,0,0,0.05) 0%, rgba(0,0,0,1) 28%, rgba(0,0,0,0.85) 100%)',
                willChange: 'transform',
              }}
            />
          </>
        )}

        {/* 3. Neon Starfield & Bokeh */}
        {lightMode === 'starfield' && (
          <>
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: `radial-gradient(circle at 28% 26%, ${palette.colors[0]} 0%, rgba(0,0,0,0) 46%), radial-gradient(circle at 72% 74%, ${palette.colors[1]} 0%, rgba(0,0,0,0) 48%)`,
                filter: `blur(${backingAuraBlurPx}px)`,
                opacity: intensity * 0.34,
              }}
            />
            {BOKEH_PARTICLES.map((particle, idx) => {
              const hex = palette.hex[particle.colorIdx % palette.hex.length]
              const color = palette.colors[particle.colorIdx % palette.colors.length]
              const diameter = particle.bokeh ? particle.size * 0.95 : particle.size * 0.55
              return (
                <div
                  key={`star-${palette.id}-${particle.id}`}
                  ref={(el) => {
                    starRefs.current[idx] = el
                  }}
                  style={{
                    position: 'absolute',
                    left: `${particle.baseX}%`,
                    top: '0%',
                    width: `${diameter}vmax`,
                    height: `${diameter}vmax`,
                    borderRadius: '50%',
                    background: particle.bokeh
                      ? `radial-gradient(circle, ${color} 0%, ${hex}55 34%, ${hex}1a 58%, rgba(0,0,0,0) 76%)`
                      : `radial-gradient(circle, #ffffff 0%, #ffffff 20%, ${hex}cc 44%, ${hex}33 68%, rgba(0,0,0,0) 100%)`,
                    opacity: particle.bokeh ? intensity * 0.72 : intensity,
                    mixBlendMode: 'screen',
                    transform: `translate3d(-50%, calc(-50% + ${particle.baseY}vh), 0)`,
                    willChange: 'transform',
                  }}
                />
              )
            })}
          </>
        )}

        {/* 4. Neon Pulse Rings */}
        {lightMode === 'rings' &&
          RING_BASE_POSITIONS.map((basePos, idx) => {
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
                  left: `${basePos.x}%`,
                  top: `${basePos.y}%`,
                  width: `${size}vmax`,
                  height: `${size}vmax`,
                  borderRadius: idx % 2 === 0 ? '50%' : '44% 56% 52% 48% / 48% 44% 56% 52%',
                  border: `2.5px solid ${hex}`,
                  boxShadow: `0 0 12px ${hex}, inset 0 0 20px ${hex}`,
                  filter: ringFilter,
                  opacity: intensity,
                  mixBlendMode: 'screen',
                  transform: 'translate3d(-50%, -50%, 0)',
                  willChange: 'transform',
                }}
              />
            )
          })}

        {/* 5. Neon Laser Lines */}
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
                  boxShadow: `0 0 12px ${hex}, 0 0 28px ${hex}`,
                  filter: laserFilter,
                  opacity: intensity,
                  mixBlendMode: 'screen',
                  transform: 'translate3d(-50%, -50%, 0)',
                  willChange: 'transform',
                }}
              />
            )
          })}

        {/* 6. Cyber Neon Plasma */}
        {lightMode === 'plasma' &&
          [0, 1, 2, 3].map((idx) => {
            const c1 = palette.colors[idx % palette.colors.length]
            const c2 = palette.colors[(idx + 1) % palette.colors.length]
            const hex2 = palette.hex[(idx + 1) % palette.hex.length]
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
                  background: `radial-gradient(circle at 30% 30%, #ffffff 0%, ${c1} 24%, ${c2} 48%, ${hex2}33 66%, rgba(0,0,0,0) 80%)`,
                  filter: `blur(${softBlurPx}px)`,
                  opacity: intensity,
                  mixBlendMode: 'screen',
                  transform: 'translate3d(-50%, -50%, 0)',
                  willChange: 'transform',
                }}
              />
            )
          })}

        {/* 7. Ambient Orbs */}
        {lightMode === 'orbs' &&
          palette.orbs.map((orb, idx) => {
            const hex = palette.hex[idx % palette.hex.length]
            return (
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
                  background: `radial-gradient(circle, ${orb.color} 0%, ${hex}66 36%, ${hex}1f 58%, rgba(0, 0, 0, 0) 74%)`,
                  filter: `blur(${softBlurPx}px)`,
                  opacity: intensity,
                  transform: 'translate3d(-50%, -50%, 0)',
                  willChange: 'transform',
                }}
              />
            )
          })}

        {/* 8. Aurora Ribbons */}
        {lightMode === 'aurora' &&
          [0, 1, 2].map((idx) => {
            const hex1 = palette.hex[idx % palette.hex.length]
            const hex2 = palette.hex[(idx + 1) % palette.hex.length]
            return (
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
                  background: `linear-gradient(90deg, rgba(0,0,0,0) 0%, ${hex1}55 18%, ${palette.colors[idx]} 36%, ${palette.colors[(idx + 1) % palette.colors.length]} 64%, ${hex2}55 82%, rgba(0,0,0,0) 100%)`,
                  filter: `blur(${softBlurPx}px)`,
                  opacity: intensity * 0.9,
                  mixBlendMode: 'screen',
                  transform: 'translate3d(-50%, -50%, 0)',
                  willChange: 'transform',
                }}
              />
            )
          })}

        {/* 9. Spotlight Beams */}
        {lightMode === 'beams' &&
          [0, 1, 2].map((idx) => {
            const hex = palette.hex[idx % palette.hex.length]
            return (
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
                  background: `conic-gradient(from 162deg at 50% 0%, rgba(0,0,0,0) 0deg, ${hex}44 10deg, ${palette.colors[idx]} 18deg, ${hex}44 26deg, rgba(0,0,0,0) 36deg)`,
                  filter: `blur(${softBlurPx}px)`,
                  opacity: intensity * 0.95,
                  mixBlendMode: 'screen',
                  willChange: 'transform',
                }}
              />
            )
          })}

        {/* 10. Liquid Caustics */}
        {lightMode === 'caustics' &&
          CAUSTIC_BASE_POSITIONS.map((basePos, idx) => {
            const hex = palette.hex[idx % palette.hex.length]
            return (
              <div
                key={`caustic-${palette.id}-${idx}`}
                ref={(el) => {
                  causticRefs.current[idx] = el
                }}
                style={{
                  position: 'absolute',
                  left: `${basePos.x}%`,
                  top: `${basePos.y}%`,
                  width: `${44 + idx * 9}vmax`,
                  height: `${34 + idx * 7}vmax`,
                  borderRadius: '42% 58% 63% 37% / 44% 39% 61% 56%',
                  background: `radial-gradient(ellipse at center, rgba(0,0,0,0) 38%, ${hex}44 52%, ${palette.colors[idx % palette.colors.length]} 63%, ${hex}33 72%, rgba(0,0,0,0) 80%)`,
                  filter: `blur(${softBlurPx}px)`,
                  opacity: intensity,
                  mixBlendMode: 'screen',
                  transform: 'translate3d(-50%, -50%, 0)',
                  willChange: 'transform',
                }}
              />
            )
          })}
      </div>

      {/* Optional Architectural Texture Overlay */}
      {textureStyle && (
        <div
          className="pointer-events-none absolute inset-0"
          data-testid="neon-texture-overlay"
          style={textureStyle}
        />
      )}

      {/* Cinema-grade adaptive OLED contrast scrim to keep neon hues jewel-toned without center white-out */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at center, rgba(4, 7, 15, 0.34) 0%, rgba(4, 7, 15, 0.50) 58%, rgba(0, 0, 0, 0.78) 100%)',
        }}
      />
    </div>
  )
})
