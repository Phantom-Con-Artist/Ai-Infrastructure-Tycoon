import { Canvas, type ThreeEvent } from '@react-three/fiber'
import { ContactShadows, OrbitControls } from '@react-three/drei'
import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { Box, Fan, MousePointer2, Server, Trash2, Waves, Zap, BatteryCharging } from 'lucide-react'
import * as A from '@sim/actions'
import { EQUIP, RACK_COST, TILE, type EquipKind } from '@sim/data/equipment'
import { COOLING, serverPeakKw } from '@sim/data/hardware'
import { canPlace, footprint, itemAt, type Rot } from '@sim/layout'
import { gpu, hasTech } from '@sim/util'
import type { Hall, Site } from '@sim/types'
import { useGame, useWorld } from '../store'
import { money } from '../format'
import { InstancedGlb, MODEL, at } from './Instanced'

type Tool = 'select' | 'rack' | EquipKind | 'remove'
const TOOLS: { id: Tool; name: string; sub: string; icon: React.ReactNode }[] = [
  { id: 'select', name: 'Inspect', sub: 'Click anything', icon: <MousePointer2 size={17} /> },
  { id: 'rack', name: 'Rack', sub: `${money(RACK_COST)} · drag to paint rows`, icon: <Server size={17} /> },
  { id: 'pdu', name: 'PDU', sub: `${EQUIP.pdu.kw} kW · reach ${EQUIP.pdu.radius}`, icon: <Zap size={17} /> },
  { id: 'crah', name: 'CRAH', sub: `${EQUIP.crah.kw} kW air · reach ${EQUIP.crah.radius}`, icon: <Fan size={17} /> },
  { id: 'cdu', name: 'CDU', sub: `${EQUIP.cdu.kw} kW liquid · reach ${EQUIP.cdu.radius}`, icon: <Waves size={17} /> },
  { id: 'ups', name: 'UPS', sub: `${EQUIP.ups.kw} kWh ride-through`, icon: <BatteryCharging size={17} /> },
  { id: 'remove', name: 'Remove', sub: 'Refunds 30%', icon: <Trash2 size={17} /> }
]
const ROT_Y = (r: Rot): number => (-r * Math.PI) / 2

function tileToWorld(h: Hall, x: number, y: number, fw = 1, fd = 1): [number, number] {
  return [(x + fw / 2) * TILE - (h.w * TILE) / 2, (y + fd / 2) * TILE - (h.d * TILE) / 2]
}
const STATUS = { ok: new THREE.Color('#38b26b'), hot: new THREE.Color('#e8572f'), throttled: new THREE.Color('#e9a23b'), dark: new THREE.Color('#9aa1ad'), empty: new THREE.Color('#c9ced6') }

export function HallEditor({ site, hall }: { site: Site; hall: Hall }) {
  const w = useWorld()
  const act = useGame((s) => s.act)
  const [tool, setTool] = useState<Tool>(hall.racks.length + hall.equipment.length === 0 ? 'pdu' : 'select')
  const [rot, setRot] = useState<Rot>(0)
  const [hover, setHover] = useState<[number, number] | null>(null)
  const [sel, setSel] = useState<[number, number] | null>(null)
  const painting = useRef(false)
  const lastPaint = useRef('')

  useEffect(() => {
    const k = (e: KeyboardEvent): void => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return
      if (e.key === 'r' || e.key === 'R') setRot((r) => ((r + 1) % 4) as Rot)
      if (e.key === 'Escape') setTool('select')
      if (e.key === 'x' || e.key === 'Delete') setTool('remove')
      const n = parseInt(e.key); if (e.altKey && n >= 1 && n <= TOOLS.length) setTool(TOOLS[n - 1].id)
    }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [])

  const apply = (x: number, y: number, silent = false): void => {
    if (tool === 'select') { setSel([x, y]); return }
    const key = `${tool}:${x},${y}`
    if (key === lastPaint.current) return
    lastPaint.current = key
    const run = (fn: (ww: typeof w) => A.Result<unknown>): void => {
      const st = useGame.getState()
      const r = fn(st.w!)
      if (!r.ok && !silent) st.flash(r.error, 'err')
      useGame.setState((s) => ({ rev: s.rev + 1 }))
    }
    if (tool === 'remove') run((ww) => A.removeAt(ww, hall.id, x, y))
    else if (tool === 'rack') run((ww) => A.placeRack(ww, hall.id, x, y, rot))
    else run((ww) => A.placeEquipment(ww, hall.id, tool, x, y, rot))
  }

  const fp = tool === 'select' || tool === 'remove' ? { w: 1, d: 1 } : footprint(tool, rot)
  const ghostErr = hover && tool !== 'select' && tool !== 'remove' ? canPlace(hall, tool, hover[0], hover[1], rot) : null
  const selected = sel ? itemAt(hall, sel[0], sel[1]) : null
  const built = w.tick >= hall.readyTick

  return (
    <div className="editor">
      <Canvas key={hall.id} shadows camera={{ position: [Math.max(hall.w, hall.d) * TILE * 0.18, Math.max(16, Math.max(hall.w, hall.d) * TILE * 0.95), Math.max(14, hall.d * TILE * 0.6 + Math.max(hall.w, hall.d) * TILE * 0.55)], fov: 42 }} dpr={[1, 1.75]}
        onPointerMissed={() => setSel(null)}>
        <color attach="background" args={['#eef1f5']} />
        <fog attach="fog" args={['#eef1f5', 60, 180]} />
        <hemisphereLight args={['#ffffff', '#c8ced8', 1.1]} />
        <directionalLight position={[20, 40, 15]} intensity={1.6} castShadow shadow-mapSize={[2048, 2048]} shadow-camera-left={-40} shadow-camera-right={40} shadow-camera-top={40} shadow-camera-bottom={-40} />
        <Suspense fallback={null}>
          <Floor hall={hall} built={built}
            onMove={(x, y) => { setHover([x, y]); if (painting.current && (tool === 'rack' || tool === 'remove')) apply(x, y, true) }}
            onDown={(x, y, e) => { if (e.button !== 0) return; painting.current = true; lastPaint.current = ''; apply(x, y) }}
            onUp={() => { painting.current = false }}
            onLeave={() => setHover(null)} />
          <HallContents hall={hall} />
          <Coverage hall={hall} tool={tool} sel={selected?.equip?.id} />
          {hover && tool !== 'select' && (
            <Ghost hall={hall} x={hover[0]} y={hover[1]} w={fp.w} d={fp.d} ok={tool === 'remove' ? !!itemAt(hall, hover[0], hover[1]) : !ghostErr} remove={tool === 'remove'} radius={tool !== 'rack' && tool !== 'remove' ? EQUIP[tool].radius : 0} />
          )}
          {sel && <SelBox hall={hall} x={sel[0]} y={sel[1]} />}
          <ContactShadows position={[0, 0.002, 0]} opacity={0.35} scale={Math.max(hall.w, hall.d) * TILE * 1.4} blur={2.4} far={6} />
        </Suspense>
        <OrbitControls makeDefault enableDamping maxPolarAngle={Math.PI / 2.15} minDistance={6} maxDistance={140}
          mouseButtons={{ LEFT: undefined as unknown as THREE.MOUSE, MIDDLE: THREE.MOUSE.PAN, RIGHT: THREE.MOUSE.ROTATE }} />
      </Canvas>

      <div className="palette">
        {TOOLS.map((t, i) => {
          const locked = (t.id === 'cdu' && (!hasTech(w, 'dlc') || !(hall.cooling === 'dlc' || hall.cooling === 'immersion')))
          return <button key={t.id} className={'tool' + (tool === t.id ? ' on' : '')} disabled={locked} style={locked ? { opacity: 0.4 } : undefined} onClick={() => setTool(t.id)} title={`Alt+${i + 1}`}>
            <span className="ti">{t.icon}</span><b>{t.name}</b><span>{locked ? 'Needs liquid-cooled hall' : t.sub}</span></button>
        })}
      </div>

      <Inspector site={site} hall={hall} sel={selected} onAuto={() => act((x) => A.autoLayout(x, hall.id), 'Auto-layout placed')} />

      <div className="hint">
        <span><span className="kbd">LMB</span> {tool === 'select' ? 'inspect' : tool === 'remove' ? 'remove' : 'place'}</span>
        <span><span className="kbd">R</span> rotate ({rot * 90}°)</span>
        <span><span className="kbd">RMB</span> orbit</span>
        <span><span className="kbd">MMB</span> pan</span>
        <span><span className="kbd">Esc</span> inspect</span>
        {ghostErr && <span className="neg">{ghostErr}</span>}
      </div>
      <div className="legend"><span><i style={{ background: '#38b26b' }} />Healthy</span><span><i style={{ background: '#e9a23b' }} />Throttled</span><span><i style={{ background: '#e8572f' }} />No cooling</span><span><i style={{ background: '#9aa1ad' }} />No power</span></div>
    </div>
  )
}

function Floor({ hall, built, onMove, onDown, onUp, onLeave }: { hall: Hall; built: boolean; onMove: (x: number, y: number) => void; onDown: (x: number, y: number, e: ThreeEvent<PointerEvent>) => void; onUp: () => void; onLeave: () => void }) {
  const W = hall.w * TILE, D = hall.d * TILE
  const lines = useMemo(() => {
    const pts: number[] = []
    for (let i = 0; i <= hall.w; i++) pts.push(i * TILE - W / 2, 0.003, -D / 2, i * TILE - W / 2, 0.003, D / 2)
    for (let j = 0; j <= hall.d; j++) pts.push(-W / 2, 0.003, j * TILE - D / 2, W / 2, 0.003, j * TILE - D / 2)
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3)); return g
  }, [hall.w, hall.d, W, D])
  const toTile = (p: THREE.Vector3): [number, number] => [Math.floor((p.x + W / 2) / TILE), Math.floor((p.z + D / 2) / TILE)]
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow><planeGeometry args={[W + 6, D + 6]} /><meshStandardMaterial color="#dfe3e9" /></mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow
        onPointerMove={(e) => { e.stopPropagation(); const [x, y] = toTile(e.point); onMove(x, y) }}
        onPointerDown={(e) => { e.stopPropagation(); const [x, y] = toTile(e.point); onDown(x, y, e) }}
        onPointerUp={onUp} onPointerLeave={() => { onUp(); onLeave() }}>
        <planeGeometry args={[W, D]} /><meshStandardMaterial color={built ? '#f7f8fa' : '#e9edf3'} />
      </mesh>
      <lineSegments geometry={lines}><lineBasicMaterial color="#6f8fbf" transparent opacity={built ? 0.18 : 0.4} /></lineSegments>
      {/* low perimeter wall */}
      {[[0, -D / 2 - 0.15, W + 0.3, 0.3], [0, D / 2 + 0.15, W + 0.3, 0.3], [-W / 2 - 0.15, 0, 0.3, D], [W / 2 + 0.15, 0, 0.3, D]].map(([x, z, ww, dd], i) =>
        <mesh key={i} position={[x, 0.35, z]} castShadow receiveShadow><boxGeometry args={[ww, 0.7, dd]} /><meshStandardMaterial color="#ffffff" /></mesh>)}
    </group>
  )
}

function HallContents({ hall }: { hall: Hall }) {
  const w = useWorld()
  const sig = hall.racks.map((r) => `${r.x},${r.y},${r.rot},${r.servers},${r.gpuId},${r.powered ? 1 : 0}${r.cooled ? 1 : 0}`).join('|') + '#' + hall.equipment.map((e) => `${e.kind}${e.x},${e.y},${e.rot}`).join('|')
  const { rackT, serverT, pads, padColors, eq } = useMemo(() => {
    const rackT: THREE.Matrix4[] = [], serverT: THREE.Matrix4[] = [], pads: THREE.Matrix4[] = [], padColors: THREE.Color[] = []
    for (const r of hall.racks) {
      const [x, z] = tileToWorld(hall, r.x, r.y)
      rackT.push(at(x, 0, z, ROT_Y(r.rot)))
      for (let k = 0; k < r.servers; k++) serverT.push(at(x, 0.12 + k * 0.255, z, ROT_Y(r.rot)))
      pads.push(at(x, 0.006, z))
      const c = !r.gpuId ? STATUS.empty : !r.powered ? STATUS.dark : !r.cooled ? STATUS.hot : r.throttle < 0.95 ? STATUS.throttled : STATUS.ok
      padColors.push(c)
    }
    const eq: Record<string, THREE.Matrix4[]> = { pdu: [], crah: [], cdu: [], ups: [] }
    for (const e of hall.equipment) {
      const f = footprint(e.kind, e.rot)
      const [x, z] = tileToWorld(hall, e.x, e.y, f.w, f.d)
      eq[e.kind].push(at(x, 0, z, ROT_Y(e.rot)))
    }
    return { rackT, serverT, pads, padColors, eq }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hall, sig, w.tick])
  return (
    <group>
      <StatusPads transforms={pads} colors={padColors} />
      {rackT.length > 0 && <InstancedGlb url={MODEL('rack')} transforms={rackT} />}
      {serverT.length > 0 && <InstancedGlb url={MODEL('server')} transforms={serverT} />}
      {(Object.keys(eq) as EquipKind[]).map((k) => eq[k].length > 0 && <InstancedGlb key={k} url={MODEL(EQUIP[k].model)} transforms={eq[k]} />)}
    </group>
  )
}

function StatusPads({ transforms, colors }: { transforms: THREE.Matrix4[]; colors: THREE.Color[] }) {
  const ref = useRef<THREE.InstancedMesh>(null)
  useEffect(() => {
    const m = ref.current; if (!m) return
    transforms.forEach((t, i) => { m.setMatrixAt(i, t); m.setColorAt(i, colors[i]) })
    m.count = transforms.length; m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true
  })
  const cap = Math.max(1, transforms.length)
  return <instancedMesh ref={ref} args={[undefined, undefined, cap]} key={cap}><boxGeometry args={[TILE * 0.92, 0.01, TILE * 0.92]} /><meshBasicMaterial transparent opacity={0.55} /></instancedMesh>
}

function Coverage({ hall, tool, sel }: { hall: Hall; tool: Tool; sel?: string }) {
  const show = (k: EquipKind, id: string): boolean => id === sel || tool === k || (tool === 'rack' && k === 'pdu') || (tool === 'crah' && k === 'cdu') || (tool === 'cdu' && k === 'crah')
  return (
    <group>
      {hall.equipment.filter((e) => e.kind !== 'ups' && show(e.kind, e.id)).map((e) => {
        const f = footprint(e.kind, e.rot)
        const [x, z] = tileToWorld(hall, e.x, e.y, f.w, f.d)
        const r = EQUIP[e.kind].radius * TILE
        const color = e.kind === 'pdu' ? '#e9a23b' : '#3b82f6'
        const over = e.load > EQUIP[e.kind].kw
        return <group key={e.id} position={[x, 0.01, z]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[r, 64]} /><meshBasicMaterial color={over ? '#e8572f' : color} transparent opacity={0.07} depthWrite={false} /></mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[r - 0.06, r, 96]} /><meshBasicMaterial color={over ? '#e8572f' : color} transparent opacity={0.8} /></mesh>
        </group>
      })}
    </group>
  )
}

function Ghost({ hall, x, y, w, d, ok, remove, radius }: { hall: Hall; x: number; y: number; w: number; d: number; ok: boolean; remove: boolean; radius: number }) {
  const [cx, cz] = tileToWorld(hall, x, y, w, d)
  const color = remove ? (ok ? '#e8572f' : '#9aa1ad') : ok ? '#38b26b' : '#e8572f'
  return (
    <group position={[cx, 0, cz]}>
      <mesh position={[0, 1.1, 0]}><boxGeometry args={[w * TILE * 0.95, 2.2, d * TILE * 0.95]} /><meshStandardMaterial color={color} transparent opacity={0.28} depthWrite={false} /></mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]}><planeGeometry args={[w * TILE, d * TILE]} /><meshBasicMaterial color={color} transparent opacity={0.45} /></mesh>
      {radius > 0 && ok && <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]}><ringGeometry args={[radius * TILE - 0.05, radius * TILE, 96]} /><meshBasicMaterial color={color} transparent opacity={0.7} /></mesh>}
    </group>
  )
}
function SelBox({ hall, x, y }: { hall: Hall; x: number; y: number }) {
  const it = itemAt(hall, x, y)
  if (!it) return null
  const e = it.equip, f = e ? footprint(e.kind, e.rot) : { w: 1, d: 1 }
  const [cx, cz] = tileToWorld(hall, e ? e.x : x, e ? e.y : y, f.w, f.d)
  return <mesh position={[cx, 0.015, cz]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[Math.max(f.w, f.d) * TILE * 0.62, Math.max(f.w, f.d) * TILE * 0.7, 48]} /><meshBasicMaterial color="#1f2533" /></mesh>
}

function Inspector({ site, hall, sel, onAuto }: { site: Site; hall: Hall; sel: ReturnType<typeof itemAt>; onAuto: () => void }) {
  const w = useWorld(); const act = useGame((s) => s.act)
  const stock = Object.entries(site.stock).filter(([, n]) => n > 0)
  const racksFree = hall.racks.filter((r) => !r.gpuId).length
  if (sel?.rack) {
    const r = sel.rack
    const pdu = hall.equipment.find((e) => e.id === r.pduId)
    return <div className="inspector">
      <h3>Rack</h3>
      <div className="row wrap">{!r.gpuId ? <span className="tag">empty</span> : <span className="tag b">{r.servers}× {gpu(w, r.gpuId).name}</span>}
        <span className={'tag ' + (r.powered ? 'g' : 'r')}>{r.powered ? 'powered' : 'no PDU in reach'}</span>
        <span className={'tag ' + (r.cooled ? 'g' : 'r')}>{r.cooled ? 'cooled' : 'no cooler in reach'}</span></div>
      <table><tbody>
        <tr><td className="dim">Draw</td><td className="r">{r.kw.toFixed(1)} kW</td></tr>
        <tr><td className="dim">Throttle</td><td className="r">{(r.throttle * 100).toFixed(0)}%</td></tr>
        <tr><td className="dim">Failed servers</td><td className="r">{r.failed}</td></tr>
        {pdu && <tr><td className="dim">Its PDU load</td><td className="r">{pdu.load.toFixed(0)} / {EQUIP.pdu.kw} kW</td></tr>}
        {r.gpuId && <tr><td className="dim">Density limit</td><td className="r">{A.maxServersPerRack(w, hall, r.gpuId)} × {serverPeakKw(gpu(w, r.gpuId)).toFixed(1)} kW</td></tr>}
      </tbody></table>
    </div>
  }
  if (sel?.equip) {
    const e = sel.equip, s = EQUIP[e.kind]
    const fed = hall.racks.filter((r) => r.pduId === e.id || r.coolerId === e.id).length
    return <div className="inspector">
      <h3>{s.name}</h3><p className="dim" style={{ fontSize: 12.5 }}>{s.blurb}</p>
      <table><tbody>
        {e.kind !== 'ups' ? <><tr><td className="dim">Load</td><td className="r" style={{ color: e.load > s.kw ? 'var(--red)' : undefined }}>{e.load.toFixed(0)} / {s.kw} kW</td></tr><tr><td className="dim">Racks served</td><td className="r">{fed}</td></tr></>
          : <tr><td className="dim">Charge</td><td className="r">{hall.upsSoc.toFixed(0)} / {hall.upsKwh} kWh</td></tr>}
      </tbody></table>
    </div>
  }
  return <div className="inspector">
    <h3>{hall.name}</h3>
    <div className="dim" style={{ fontSize: 12.5 }}>{COOLING[hall.cooling].name} · {hall.w}×{hall.d} tiles</div>
    <table><tbody>
      <tr><td className="dim">Racks</td><td className="r">{hall.racks.length} <span className="dim">({racksFree} empty)</span></td></tr>
      <tr><td className="dim">PDU capacity</td><td className="r">{hall.powerKw} kW</td></tr>
      <tr><td className="dim">Cooling</td><td className="r">{hall.coolKw} kW</td></tr>
      <tr><td className="dim">IT load</td><td className="r">{hall.itKw.toFixed(0)} kW</td></tr>
      <tr><td className="dim">Temperature</td><td className="r">{hall.tempC.toFixed(1)} °C</td></tr>
    </tbody></table>
    {stock.length > 0 && <div className="col" style={{ gap: 6 }}>
      <b style={{ fontSize: 13 }}>On the loading dock</b>
      {stock.map(([id, n]) => <button key={id} className="btn sm pri" onClick={() => { const r = act((x) => A.installServers(x, site.id, hall.id, id, n)); if (r.ok) useGame.getState().flash(`Installed ${r.value} servers`) }}>Install {n}× {gpu(w, id).name}</button>)}
    </div>}
    <button className="btn sm ghost" onClick={onAuto}>Auto-layout empty space</button>
  </div>
}
