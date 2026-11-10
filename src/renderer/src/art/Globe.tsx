/**
 * The world as a night-side network globe: dotted continents on a deep-navy sphere, your backbone as glowing
 * great-circle arcs with packets running along them, rival campuses as faint nodes. Canvas 2D, ~60 fps.
 * Drag to spin; it idles slowly; click a region to pick it.
 */
import { useEffect, useRef, useState } from 'react'
import type { World } from '@sim/types'
import { REGIONS } from '@sim/data/hardware'
import { RIVAL_HUBS, corp } from '@sim/data/lore'
import { LAND_B64, LAND_H, LAND_W } from './landMask'

type V3 = [number, number, number]
const RAD = Math.PI / 180
const toV = (lon: number, lat: number): V3 => [Math.cos(lat * RAD) * Math.sin(lon * RAD), Math.sin(lat * RAD), Math.cos(lat * RAD) * Math.cos(lon * RAD)]

/** Land dots as unit vectors, thinned toward the poles so spacing stays even on the sphere. */
const LAND: V3[] = (() => {
  const bin = atob(LAND_B64), out: V3[] = []
  for (let r = 0; r < LAND_H; r++) {
    const lat = 90 - (r + 0.5) * (180 / LAND_H)
    const step = Math.max(1, Math.round(1 / Math.max(0.15, Math.cos(lat * RAD))))
    for (let c = 0; c < LAND_W; c += step) {
      const i = r * LAND_W + c
      if (bin.charCodeAt(i >> 3) & (1 << (i & 7))) out.push(toV(-180 + (c + 0.5) * (360 / LAND_W), lat))
    }
  }
  return out
})()

function slerpArc(a: V3, b: V3, n: number, height = 0.32): V3[] {
  const d = Math.acos(Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2]))
  const pts: V3[] = []
  for (let i = 0; i <= n; i++) {
    const t = i / n, s = Math.sin(d) || 1
    const k1 = Math.sin((1 - t) * d) / s, k2 = Math.sin(t * d) / s
    const lift = 1 + Math.sin(Math.PI * t) * Math.min(height, d * 0.18)
    pts.push([(a[0] * k1 + b[0] * k2) * lift, (a[1] * k1 + b[1] * k2) * lift, (a[2] * k1 + b[2] * k2) * lift])
  }
  return pts
}

interface Node { id: string; v: V3; label: string; mine: boolean; mw: number; color: string; hub?: boolean }

export function Globe({ w, onPick, height = 360 }: { w: World; onPick?: (regionId: string) => void; height?: number }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const view = useRef({ lon: -40, lat: 22, vlon: 0, drag: false, px: 0, py: 0, moved: 0, hover: '' })
  const [hover, setHover] = useState<Node | null>(null)
  const mwBy: Record<string, number> = {}
  for (const s of w.sites) mwBy[s.regionId] = (mwBy[s.regionId] ?? 0) + s.utilityMw
  const nodes: Node[] = [
    ...REGIONS.map((r) => ({ id: r.id, v: toV(...r.ll), label: r.name, mine: !!mwBy[r.id], mw: mwBy[r.id] ?? 0, color: '' })),
    ...RIVAL_HUBS.map((h, i) => ({ id: 'hub' + i, v: toV(...h.ll), label: `${corp(h.corp).name} · ${h.name}`, mine: false, mw: 0, color: corp(h.corp).color, hub: true }))
  ]
  const mine = nodes.filter((n) => n.mine)
  // Backbone: chain your campuses in the order you built them, then close the loop.
  const order = [...new Set(w.sites.map((s) => s.regionId))].map((id) => nodes.find((n) => n.id === id)!).filter(Boolean)
  const backbone: V3[][] = order.length > 1 ? order.map((n, i) => slerpArc(n.v, order[(i + 1) % order.length].v, 48)).slice(0, order.length === 2 ? 1 : order.length) : []
  // Rival mesh: each hub links to the next two of the same company, plus a transatlantic/transpacific spine.
  const rival: V3[][] = []
  RIVAL_HUBS.forEach((h, i) => {
    const sib = RIVAL_HUBS.map((x, j) => ({ x, j })).filter(({ x, j }) => x.corp === h.corp && j > i).slice(0, 1)
    for (const { j } of sib) rival.push(slerpArc(nodes[REGIONS.length + i].v, nodes[REGIONS.length + j].v, 40, 0.06))
  })
  const data = useRef({ nodes, backbone, rival, mine })
  data.current = { nodes, backbone, rival, mine }

  useEffect(() => {
    const cv = ref.current!; const ctx = cv.getContext('2d')!
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
    let raf = 0, last = performance.now()
    const frame = (now: number): void => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now
      const v = view.current
      if (!v.drag) { v.lon += (reduce ? 0 : 4) * dt + v.vlon; v.vlon *= 0.94 }
      const dpr = devicePixelRatio || 1, W = cv.clientWidth, H = cv.clientHeight
      if (cv.width !== W * dpr || cv.height !== H * dpr) { cv.width = W * dpr; cv.height = H * dpr }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, W, H)
      const R = Math.min(W * 0.42, H * 0.44), cx = W / 2, cy = H / 2 + 4
      const cl = Math.cos(-v.lon * RAD), sl = Math.sin(-v.lon * RAD), ct = Math.cos(v.lat * RAD), st = Math.sin(v.lat * RAD)
      const P = (p: V3): [number, number, number] => {
        const x = p[0] * cl + p[2] * sl, z0 = -p[0] * sl + p[2] * cl
        const y = p[1] * ct - z0 * st, z = p[1] * st + z0 * ct
        return [cx + x * R, cy - y * R, z]
      }
      // atmosphere + sphere
      const halo = ctx.createRadialGradient(cx, cy, R * 0.9, cx, cy, R * 1.28)
      halo.addColorStop(0, 'oklch(0.62 0.16 250 / .45)'); halo.addColorStop(1, 'oklch(0.62 0.16 250 / 0)')
      ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(cx, cy, R * 1.28, 0, 7); ctx.fill()
      const body = ctx.createRadialGradient(cx - R * 0.35, cy - R * 0.4, R * 0.1, cx, cy, R)
      body.addColorStop(0, 'oklch(0.36 0.09 258)'); body.addColorStop(0.7, 'oklch(0.22 0.07 262)'); body.addColorStop(1, 'oklch(0.16 0.05 265)')
      ctx.fillStyle = body; ctx.beginPath(); ctx.arc(cx, cy, R, 0, 7); ctx.fill()
      // land dots (front hemisphere only, dimmer at the limb)
      const ds = Math.max(0.9, R / 190)
      for (const p of LAND) {
        const [x, y, z] = P(p); if (z <= 0.02) continue
        ctx.fillStyle = `oklch(${0.62 + z * 0.25} 0.09 240 / ${0.25 + z * 0.65})`
        ctx.fillRect(x - ds / 2, y - ds / 2, ds, ds)
      }
      const t = now / 1000
      const drawArc = (pts: V3[], stroke: string, width: number, packet: boolean, seed: number): void => {
        ctx.strokeStyle = stroke; ctx.lineWidth = width; ctx.beginPath()
        let pen = false
        for (const p of pts) { const [x, y, z] = P(p); const vis = z > -0.05; if (vis && pen) ctx.lineTo(x, y); else if (vis) { ctx.moveTo(x, y); pen = true } else pen = false }
        ctx.stroke()
        if (packet && !reduce) for (const off of [0, 0.5]) {
          const k = ((t * 0.22 + seed * 0.137 + off) % 1) * (pts.length - 1)
          const [x, y, z] = P(pts[Math.floor(k)]); if (z < 0) continue
          const g = ctx.createRadialGradient(x, y, 0, x, y, 7); g.addColorStop(0, 'oklch(0.97 0.05 200 / .95)'); g.addColorStop(1, 'oklch(0.97 0.05 200 / 0)')
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 7, 0, 7); ctx.fill()
        }
      }
      const d = data.current
      d.rival.forEach((a, i) => drawArc(a, 'oklch(0.9 0.03 240 / .22)', 1, false, i))
      ctx.shadowColor = 'oklch(0.8 0.15 200)'; ctx.shadowBlur = 10
      d.backbone.forEach((a, i) => drawArc(a, 'oklch(0.86 0.13 200 / .9)', 2, true, i))
      ctx.shadowBlur = 0
      // nodes
      for (const n of d.nodes) {
        const [x, y, z] = P(n.v); if (z < 0.05) continue
        if (n.hub) { ctx.fillStyle = 'oklch(0.92 0.02 240 / .55)'; ctx.beginPath(); ctx.arc(x, y, 1.8, 0, 7); ctx.fill(); continue }
        if (n.mine) {
          const pulse = reduce ? 0.5 : (t * 0.8 + n.v[0]) % 1
          ctx.strokeStyle = `oklch(0.86 0.13 200 / ${1 - pulse})`; ctx.lineWidth = 1.5
          ctx.beginPath(); ctx.arc(x, y, 5 + pulse * 16, 0, 7); ctx.stroke()
          ctx.fillStyle = 'oklch(0.95 0.08 200)'; ctx.beginPath(); ctx.arc(x, y, 4 + Math.min(5, Math.sqrt(n.mw) * 0.6), 0, 7); ctx.fill()
        } else {
          ctx.strokeStyle = 'oklch(0.95 0.02 240 / .8)'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(x, y, 3.5, 0, 7); ctx.stroke()
        }
        if (n.mine || v.hover === n.id) {
          ctx.font = '600 12px Inter Variable, sans-serif'; ctx.fillStyle = 'oklch(0.97 0.01 240)'
          ctx.fillText(n.label.split(',')[0] + (n.mine ? ` · ${n.mw} MW` : ''), x + 9, y - 7)
        }
      }
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [])

  const pickAt = (e: React.PointerEvent): Node | null => {
    const cv = ref.current!, b = cv.getBoundingClientRect(), v = view.current
    const W = b.width, H = b.height, R = Math.min(W * 0.42, H * 0.44), cx = W / 2, cy = H / 2 + 4
    const cl = Math.cos(-v.lon * RAD), sl = Math.sin(-v.lon * RAD), ct = Math.cos(v.lat * RAD), st = Math.sin(v.lat * RAD)
    let best: Node | null = null, bd = 14
    for (const n of data.current.nodes) {
      const p = n.v, x = p[0] * cl + p[2] * sl, z0 = -p[0] * sl + p[2] * cl, y = p[1] * ct - z0 * st, z = p[1] * st + z0 * ct
      if (z < 0.05) continue
      const dd = Math.hypot(cx + x * R - (e.clientX - b.left), cy - y * R - (e.clientY - b.top))
      if (dd < bd) { bd = dd; best = n }
    }
    return best
  }

  return (
    <div className="globe" style={{ height }}>
      <canvas ref={ref} style={{ width: '100%', height: '100%', display: 'block', cursor: hover && !hover.hub ? 'pointer' : 'grab', touchAction: 'none' }} aria-label="Globe of your datacenter network"
        onPointerDown={(e) => { const v = view.current; v.drag = true; v.px = e.clientX; v.py = e.clientY; v.moved = 0; (e.target as Element).setPointerCapture(e.pointerId) }}
        onPointerMove={(e) => {
          const v = view.current
          if (v.drag) { const dx = e.clientX - v.px, dy = e.clientY - v.py; v.px = e.clientX; v.py = e.clientY; v.moved += Math.abs(dx) + Math.abs(dy); v.lon -= dx * 0.35; v.vlon = -dx * 0.02; v.lat = Math.max(-60, Math.min(70, v.lat + dy * 0.3)); return }
          const n = pickAt(e); v.hover = n?.id ?? ''; setHover(n)
        }}
        onPointerUp={(e) => { const v = view.current; v.drag = false; if (v.moved < 4) { const n = pickAt(e); if (n && !n.hub) onPick?.(n.id) } }}
        onPointerLeave={() => { view.current.hover = ''; setHover(null) }} />
      {hover && <div className="globe-tip">{hover.hub ? <><b>{hover.label.split(' · ')[1]}</b><span>{hover.label.split(' · ')[0]} campus</span></> : <><b>{hover.label}</b><span>{hover.mine ? `Your campus · ${hover.mw} MW` : 'Open for a new site — click'}</span></>}</div>}
      <div className="globe-legend"><span><i className="me" />Your campuses</span><span><i className="bb" />Your backbone</span><span><i className="rv" />Rival campuses</span></div>
    </div>
  )
}
