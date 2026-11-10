import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { siBlender, siClaude, siElectron, siReact, siSqlite, siThreedotjs, siTypescript, siVite } from 'simple-icons'

/** 4D hypercube: 16 vertices (±1)^4, 32 edges between vertices differing in exactly one coordinate. */
const V: number[][] = []
for (let i = 0; i < 16; i++) V.push([i & 1 ? 1 : -1, i & 2 ? 1 : -1, i & 4 ? 1 : -1, i & 8 ? 1 : -1])
const EDGES: [number, number][] = []
for (let i = 0; i < 16; i++) for (let b = 0; b < 4; b++) { const j = i ^ (1 << b); if (i < j) EDGES.push([i, j]) }

function project(v: number[], a: number, b: number, c: number): [number, number, number, number] {
  let [x, y, z, w] = v
  ;[x, w] = [x * Math.cos(a) - w * Math.sin(a), x * Math.sin(a) + w * Math.cos(a)] // XW rotation (the 4D turn)
  ;[y, z] = [y * Math.cos(b) - z * Math.sin(b), y * Math.sin(b) + z * Math.cos(b)] // YZ rotation
  ;[z, w] = [z * Math.cos(c) - w * Math.sin(c), z * Math.sin(c) + w * Math.cos(c)] // ZW wobble
  const k4 = 1 / (3 - w)           // 4D → 3D perspective
  const X = x * k4, Y = y * k4, Z = z * k4
  const k3 = 1 / (3.2 - Z)         // 3D → 2D perspective
  return [X * k3, Y * k3, Z, w]
}

function Tesseract({ size, scale }: { size: number; scale: number }) {
  const ref = useRef<SVGSVGElement>(null)
  useEffect(() => {
    let raf = 0
    const t0 = performance.now()
    const draw = (now: number): void => {
      const t = (now - t0) / 1000
      const svg = ref.current
      if (svg) {
        const P = V.map((v) => project(v, t * 0.9, t * 0.45 + 0.6, Math.sin(t * 0.5) * 0.4))
        const lines = svg.querySelectorAll('line'), dots = svg.querySelectorAll('circle')
        const s = size * 2.3
        EDGES.forEach(([i, j], k) => {
          const l = lines[k] as SVGLineElement
          l.setAttribute('x1', String(size / 2 + P[i][0] * s)); l.setAttribute('y1', String(size / 2 + P[i][1] * s))
          l.setAttribute('x2', String(size / 2 + P[j][0] * s)); l.setAttribute('y2', String(size / 2 + P[j][1] * s))
          const depth = (P[i][3] + P[j][3]) / 2
          l.setAttribute('stroke-opacity', String(0.35 + 0.65 * (depth + 1.5) / 3))
        })
        P.forEach((p, k) => { const d = dots[k] as SVGCircleElement; d.setAttribute('cx', String(size / 2 + p[0] * s)); d.setAttribute('cy', String(size / 2 + p[1] * s)); d.setAttribute('r', String(2 + (p[3] + 1.5))) })
      }
      raf = requestAnimationFrame(draw)
    }
    raf = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(raf)
  }, [size])
  return (
    <svg ref={ref} width={size} height={size} style={{ transform: `scale(${scale})`, transition: 'transform 1.2s cubic-bezier(0.34, 1.56, 0.64, 1)', overflow: 'visible', filter: 'drop-shadow(0 0 14px oklch(0.75 0.17 290 / .55))' }} aria-label="Phantom-Con Artist tesseract">
      <defs><linearGradient id="tg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#c7b5ff" /><stop offset="1" stopColor="#6fe3c1" /></linearGradient></defs>
      {EDGES.map((_, k) => <line key={k} stroke="url(#tg)" strokeWidth={1.6} strokeLinecap="round" />)}
      {V.map((_, k) => <circle key={k} fill="#ffffff" />)}
    </svg>
  )
}

const REMOTION = 'M12 0a12 12 0 1 0 0 24 12 12 0 0 0 0-24Zm-2.4 6.6 7.2 4.6a1 1 0 0 1 0 1.6l-7.2 4.6a1 1 0 0 1-1.5-.8V7.4a1 1 0 0 1 1.5-.8Z'
const TOOLS: { name: string; path: string; hex: string }[] = [
  { name: 'Electron', path: siElectron.path, hex: '#9feaf9' }, { name: 'React', path: siReact.path, hex: '#61dafb' }, { name: 'Three.js', path: siThreedotjs.path, hex: '#ffffff' },
  { name: 'Remotion', path: REMOTION, hex: '#6aa8ff' }, { name: 'Blender', path: siBlender.path, hex: '#f5792a' }, { name: 'TypeScript', path: siTypescript.path, hex: '#3178c6' },
  { name: 'Vite', path: siVite.path, hex: '#bd34fe' }, { name: 'SQLite', path: siSqlite.path, hex: '#7fb3d5' }
]
const STUDIO = 'PHANTOM-CON ARTIST'

/** Studio intro → credits → title + real asset loading. Any key or click skips. */
export function Splash({ onDone }: { onDone: () => void }) {
  const [t, setT] = useState(0)
  const [progress, setProgress] = useState(0)
  const [leaving, setLeaving] = useState(false)
  const loaded = useRef({ assets: false, fonts: false })
  useEffect(() => {
    const t0 = performance.now(); let raf = 0
    const tick = (): void => { setT((performance.now() - t0) / 1000); raf = requestAnimationFrame(tick) }
    raf = requestAnimationFrame(tick)
    const mgr = THREE.DefaultLoadingManager
    mgr.onProgress = (_u, done, total) => setProgress(total ? done / total : 1)
    mgr.onLoad = () => { loaded.current.assets = true; setProgress(1) }
    document.fonts?.ready.then(() => { loaded.current.fonts = true })
    // nothing queued yet → assets are trivially ready
    setTimeout(() => { if (progress === 0) loaded.current.assets = true }, 1500)
    const skip = (): void => setLeaving(true)
    window.addEventListener('keydown', skip); window.addEventListener('mousedown', skip)
    return () => { cancelAnimationFrame(raf); window.removeEventListener('keydown', skip); window.removeEventListener('mousedown', skip) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  useEffect(() => { if (t > 7.4 && loaded.current.fonts) setLeaving(true) }, [t])
  useEffect(() => { if (leaving) { const id = setTimeout(onDone, 650); return () => clearTimeout(id) } }, [leaving, onDone])
  const scene = t < 3.6 ? 0 : t < 6 ? 1 : 2
  const fade = (a: number, b: number): number => Math.max(0, Math.min(1, (t - a) / (b - a)))
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'radial-gradient(120% 90% at 50% 40%, #1b1830, #0b0a12 70%)', color: 'white', display: 'grid', placeItems: 'center', opacity: leaving ? 0 : 1, transition: 'opacity .6s ease', fontFamily: 'var(--display)', overflow: 'hidden' } as React.CSSProperties}>
      {/* starfield */}
      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.5 }} aria-hidden>{Array.from({ length: 60 }, (_, i) => <circle key={i} cx={`${(i * 37.7) % 100}%`} cy={`${(i * 61.3) % 100}%`} r={(i % 3) * 0.5 + 0.4} fill="white" opacity={0.3 + ((i * 13) % 7) / 10 * Math.abs(Math.sin(t * 0.8 + i))} />)}</svg>

      {scene === 0 && <div style={{ display: 'grid', justifyItems: 'center', gap: 34, opacity: 1 - fade(3.2, 3.6) }}>
        <Tesseract size={240} scale={t < 0.15 ? 0.2 : 1} />
        <div style={{ display: 'flex', gap: '0.06em', fontSize: 44, fontWeight: 700, letterSpacing: '0.18em' }}>
          {STUDIO.split('').map((ch, i) => <span key={i} style={{ opacity: fade(0.8 + i * 0.05, 1.1 + i * 0.05), transform: `translateY(${(1 - fade(0.8 + i * 0.05, 1.3 + i * 0.05)) * 18}px)`, display: 'inline-block', color: ch === '-' ? '#9f86ff' : 'white', minWidth: ch === ' ' ? '0.4em' : undefined }}>{ch}</span>)}
        </div>
        <div style={{ fontSize: 15, letterSpacing: '0.5em', color: '#a9a4c4', opacity: fade(2.2, 2.7), marginTop: -16 }}>PRESENTS</div>
      </div>}

      {scene === 1 && <div style={{ display: 'grid', justifyItems: 'center', gap: 30, opacity: fade(3.6, 4.0) * (1 - fade(5.6, 6.0)) }}>
        <div style={{ fontSize: 14, letterSpacing: '0.5em', color: '#a9a4c4' }}>MADE WITH</div>
        <div style={{ display: 'flex', gap: 34 }}>{TOOLS.map((x, i) => (
          <div key={x.name} style={{ display: 'grid', justifyItems: 'center', gap: 10, opacity: fade(3.8 + i * 0.12, 4.1 + i * 0.12), transform: `translateY(${(1 - fade(3.8 + i * 0.12, 4.3 + i * 0.12)) * 20}px)` }}>
            <svg width={44} height={44} viewBox="0 0 24 24"><path d={x.path} fill={x.hex} /></svg><span style={{ fontSize: 12.5, color: '#cfcae6', fontFamily: 'var(--sans)' }}>{x.name}</span></div>))}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 14, opacity: fade(4.8, 5.2) }}>
          <svg width={34} height={34} viewBox="0 0 24 24"><path d={siClaude.path} fill="#d97757" /></svg>
          <span style={{ fontSize: 24, fontWeight: 600 }}>Built with <span style={{ color: '#e8a084' }}>Claude Code</span></span>
        </div>
      </div>}

      {scene === 2 && <div style={{ display: 'grid', justifyItems: 'center', gap: 20, opacity: fade(6.0, 6.4) }}>
        <div style={{ fontSize: 13, letterSpacing: '0.5em', color: '#a9a4c4' }}>PHANTOM-CON ARTIST</div>
        <div style={{ fontSize: 76, fontWeight: 750, letterSpacing: '-0.045em', lineHeight: 0.95, textAlign: 'center' }}>AI Infrastructure<br /><span style={{ background: 'linear-gradient(90deg, #6fe3c1, #9f86ff)', WebkitBackgroundClip: 'text', color: 'transparent' }}>Tycoon</span></div>
        <div style={{ width: 320, height: 4, borderRadius: 99, background: '#ffffff18', overflow: 'hidden', marginTop: 16 }}><div style={{ height: '100%', width: `${Math.max(fade(6.0, 7.3), progress) * 100}%`, background: 'linear-gradient(90deg, #6fe3c1, #9f86ff)', transition: 'width .3s' }} /></div>
        <div style={{ fontSize: 12.5, color: '#8f8aa8', fontFamily: 'var(--sans)' }}>{['Energising substations…', 'Spinning up chillers…', 'Bribing the utility…', 'Warming up tensor cores…'][Math.floor(t * 2) % 4]}</div>
      </div>}

      <div style={{ position: 'absolute', bottom: 22, fontSize: 12, color: '#6e6a86', fontFamily: 'var(--sans)' }}>Press any key to skip</div>
    </div>
  )
}
