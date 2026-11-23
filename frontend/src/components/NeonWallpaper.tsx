import { useEffect, useMemo, useRef, type CSSProperties } from 'react'
import {
  BOKEH_PARTICLES,
  PALETTES,
  PRISM_SHAPES,
  type NeonSettings,
  type PrismShape,
  type TextureModeId,
} from '../lib/neonWallpaper'

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

export function NeonWallpaper({ settings }: { settings: NeonSettings }) {
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
  const lastFrameRef = useRef<number | null>(null)

  const palette = useMemo(
    () => PALETTES.find((item) => item.id === paletteId) ?? PALETTES[0],
    [paletteId],
  )

  const textureStyle = useMemo(() => getTextureStyle(textureMode), [textureMode])

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
      if (!reducedMotion) {
        pointer.x += (pointer.targetX - pointer.x) * 0.04
        pointer.y += (pointer.targetY - pointer.y) * 0.04
      }

      const t = timeRef.current

      if (lightMode === 'prisms') {
        PRISM_SHAPES.forEach((shape, idx) => {
          const el = prismRefs.current[idx]
          if (!el) return
          const x = shape.baseX + Math.sin(t * shape.freqX + shape.phase) * shape.ampX
          const y = shape.baseY + Math.cos(t * shape.freqY + shape.phase * 0.8) * shape.ampY
          const rotZ = t * shape.rotSpeed + shape.phase * 24
          const rotX = Math.sin(t * shape.tiltSpeed + shape.phase) * 28
          const rotY = Math.cos(t * shape.tiltSpeed * 0.85 + shape.phase) * 32
          const scale = 0.94 + Math.sin(t * 0.28 + shape.phase) * 0.1
          const pf = idx % 2 === 0 ? 0.9 : -0.7
          el.style.left = `${x}%`
          el.style.top = `${y}%`
          el.style.transform = `translate3d(calc(-50% + ${(pointer.x * pf).toFixed(1)}px), calc(-50% + ${(pointer.y * pf).toFixed(1)}px), 0) perspective(700px) rotateX(${rotX.toFixed(1)}deg) rotateY(${rotY.toFixed(1)}deg) rotateZ(${rotZ.toFixed(1)}deg) scale(${scale.toFixed(3)})`
        })
      } else if (lightMode === 'grid3d') {
        const plane = gridPlaneRef.current
        if (plane) {
          const scrollOffset = (t * 48) % 64
          const tiltX = 68 + pointer.y * 0.14
          const shiftX = pointer.x * 0.7
          plane.style.backgroundPosition = `center ${scrollOffset.toFixed(1)}px`
          plane.style.transform = `translate3d(calc(-50% + ${shiftX.toFixed(1)}px), 0, 0) perspective(560px) rotateX(${tiltX.toFixed(2)}deg)`
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
          const driftY = (particle.baseY - ((t * particle.speed * 14) % 116) + 116) % 116 - 8
          const driftX = particle.baseX + Math.sin(t * particle.speed + particle.phase) * 4.5
          const scale = 0.8 + Math.sin(t * (0.6 + particle.speed) + particle.phase) * 0.26
          const pf = particle.depth * 1.1
          el.style.left = `${driftX}%`
          el.style.top = `${driftY}%`
          el.style.transform = `translate3d(calc(-50% + ${(pointer.x * pf).toFixed(1)}px), calc(-50% + ${(pointer.y * pf).toFixed(1)}px), 0) scale(${scale.toFixed(3)})`
        })
      } else if (lightMode === 'orbs') {
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
  }, [isPlaying, speed, palette, lightMode])

  return (
    <div
      className="neon-wallpaper fixed inset-0 -z-10 overflow-hidden bg-black pointer-events-none select-none"
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
                filter: `blur(${Math.max(45, blurLevel * 0.75)}px)`,
                opacity: intensity * 0.38,
              }}
            />
            {PRISM_SHAPES.map((shape, idx) => {
              const hex = palette.hex[shape.colorIdx % palette.hex.length]
              const glowBlur = Math.max(1, (blurLevel - 50) * 0.06)
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
                    filter: `drop-shadow(0 0 12px ${hex}) drop-shadow(0 0 28px ${hex}) blur(${glowBlur}px)`,
                    transform: 'translate3d(-50%, -50%, 0)',
                    willChange: 'transform, left, top',
                  }}
                >
                  <svg viewBox="0 0 100 100" className="h-full w-full overflow-visible">
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
                      fillOpacity="0.12"
                      stroke="#ffffff"
                      strokeOpacity="0.45"
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
                filter: `blur(${Math.max(36, blurLevel * 0.72)}px)`,
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
                boxShadow: `0 0 16px ${palette.hex[0]}, 0 0 40px ${palette.hex[1]}`,
                opacity: intensity,
              }}
            />
            <div
              ref={gridPlaneRef}
              style={{
                position: 'absolute',
                left: '50%',
                top: '45%',
                width: '190vmax',
                height: '110vmax',
                transformOrigin: '50% 0%',
                transform: 'translate3d(-50%, 0, 0) perspective(560px) rotateX(68deg)',
                backgroundImage: `linear-gradient(to right, ${palette.hex[1]} 1.5px, transparent 1.5px), linear-gradient(to bottom, ${palette.hex[0]} 1.5px, transparent 1.5px)`,
                backgroundSize: '64px 64px',
                opacity: intensity * 0.76,
                mixBlendMode: 'screen',
                maskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.05) 0%, rgba(0,0,0,1) 28%, rgba(0,0,0,0.85) 100%)',
                WebkitMaskImage:
                  'linear-gradient(to bottom, rgba(0,0,0,0.05) 0%, rgba(0,0,0,1) 28%, rgba(0,0,0,0.85) 100%)',
                filter: `drop-shadow(0 0 8px ${palette.hex[0]})`,
                willChange: 'transform, background-position',
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
                filter: `blur(${Math.max(48, blurLevel * 0.8)}px)`,
                opacity: intensity * 0.34,
              }}
            />
            {BOKEH_PARTICLES.map((particle, idx) => {
              const hex = palette.hex[particle.colorIdx % palette.hex.length]
              const color = palette.colors[particle.colorIdx % palette.colors.length]
              const bokehBlur = particle.bokeh ? Math.max(4, blurLevel * 0.12) : 0.6
              return (
                <div
                  key={`star-${palette.id}-${particle.id}`}
                  ref={(el) => {
                    starRefs.current[idx] = el
                  }}
                  style={{
                    position: 'absolute',
                    left: `${particle.baseX}%`,
                    top: `${particle.baseY}%`,
                    width: `${particle.bokeh ? particle.size * 0.85 : particle.size * 0.18}vmax`,
                    height: `${particle.bokeh ? particle.size * 0.85 : particle.size * 0.18}vmax`,
                    borderRadius: '50%',
                    background: particle.bokeh
                      ? `radial-gradient(circle, ${color} 0%, rgba(0,0,0,0) 72%)`
                      : '#ffffff',
                    boxShadow: particle.bokeh
                      ? `0 0 24px ${hex}`
                      : `0 0 8px #ffffff, 0 0 18px ${hex}`,
                    filter: `blur(${bokehBlur}px)`,
                    opacity: particle.bokeh ? intensity * 0.72 : intensity,
                    mixBlendMode: 'screen',
                    transform: 'translate3d(-50%, -50%, 0)',
                    willChange: 'transform, left, top',
                  }}
                />
              )
            })}
          </>
        )}

        {/* 4. Neon Pulse Rings */}
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

        {/* 6. Cyber Neon Plasma */}
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

        {/* 7. Ambient Orbs */}
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

        {/* 8. Aurora Ribbons */}
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

        {/* 9. Spotlight Beams */}
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

        {/* 10. Liquid Caustics */}
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

      {/* Optional Architectural Texture Overlay */}
      {textureStyle && (
        <div
          className="pointer-events-none absolute inset-0"
          data-testid="neon-texture-overlay"
          style={textureStyle}
        />
      )}

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
