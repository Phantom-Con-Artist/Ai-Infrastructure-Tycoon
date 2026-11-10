/**
 * Your chip, in 3D, built from the spec: substrate, interposer, compute dies, SRAM cache dies (SoIC), HBM stacks
 * with visible layers, lid. "Explode" lifts every layer apart. Every absurd mod shows up on the package.
 * Scale: 1 unit = 10 mm, heights exaggerated so thin layers read.
 */
import { Canvas, useFrame } from '@react-three/fiber'
import { ContactShadows, Environment, Lightformer, OrbitControls, RoundedBox } from '@react-three/drei'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import type { ChipEval, ChipSpec } from '@sim/silicon'
import type { ChipLook } from '@sim/data/silicon'

export const DEFAULT_LOOK: ChipLook = { substrate: '#2f5d43', lid: 'nickel', accent: '#9a7bff', label: '' }
const LID: Record<ChipLook['lid'], { color: string; metal: number; rough: number; opacity?: number }> = {
  nickel: { color: '#c9ced6', metal: 0.9, rough: 0.28 }, black: { color: '#22252b', metal: 0.6, rough: 0.35 },
  copper: { color: '#c7774a', metal: 0.95, rough: 0.3 }, clear: { color: '#cfe6ff', metal: 0, rough: 0.05, opacity: 0.25 }
}

interface Layout { sub: [number, number]; inter: [number, number] | null; dies: [number, number, number, number][]; hbm: [number, number][]; wafer: boolean }
function layout(s: ChipSpec): Layout {
  if (s.pkg === 'wafer') return { sub: [32, 32], inter: null, dies: [], hbm: [], wafer: true }
  const dw = Math.sqrt(s.dieMm2 * 1.25) / 10, dd = Math.sqrt(s.dieMm2 / 1.25) / 10
  const n = Math.max(1, s.dies), cols = Math.ceil(Math.sqrt(n)), rows = Math.ceil(n / cols), gap = 0.12
  const gw = cols * dw + (cols - 1) * gap, gd = rows * dd + (rows - 1) * gap
  const dies: Layout['dies'] = []
  for (let i = 0; i < n; i++) { const c = i % cols, r = Math.floor(i / cols); dies.push([-gw / 2 + dw / 2 + c * (dw + gap), -gd / 2 + dd / 2 + r * (dd + gap), dw, dd]) }
  const stacks = s.kind === 'gpu' ? s.hbmStacks : 0, perSide = Math.ceil(stacks / 2), hd = 1.1
  const colH = Math.max(gd, perSide * (hd + 0.1))
  const hbm: Layout['hbm'] = []
  for (let i = 0; i < stacks; i++) { const left = i < perSide, k = left ? i : i - perSide; hbm.push([(left ? -1 : 1) * (gw / 2 + 0.25 + 0.55), -colH / 2 + hd / 2 + k * (hd + 0.1)]) }
  const iw = gw + (stacks ? 2 * (0.25 + 1.1) : 0) + 0.5, idd = colH + 0.5
  return { sub: [Math.max(4.5, iw + 1.6), Math.max(4.5, idd + 1.6)], inter: s.pkg === 'mono' ? null : [iw, idd], dies, hbm, wafer: false }
}

function Layer({ y, explode, gap, children }: { y: number; explode: React.MutableRefObject<number>; gap: number; children: React.ReactNode }) {
  const g = useRef<THREE.Group>(null)
  useFrame(() => { if (g.current) g.current.position.y = y + explode.current * gap })
  return <group ref={g}>{children}</group>
}

export function ChipScene({ s, e, exploded, height = 360 }: { s: ChipSpec; e: ChipEval; exploded: boolean; height?: number }) {
  return (
    <div className="chip3d" style={{ height }}>
      <Canvas shadows camera={{ position: [5.5, 5.2, 6.5], fov: 36 }} dpr={[1, 1.75]}>
        <color attach="background" args={['#161b26']} />
        <hemisphereLight args={['#dfe7ff', '#20242e', 0.35]} />
        <directionalLight position={[6, 10, 4]} intensity={1.1} castShadow shadow-mapSize={[1024, 1024]} shadow-bias={-0.0005} />
        <Environment resolution={128} environmentIntensity={0.55}>
          <Lightformer intensity={1} position={[0, 6, 0]} rotation-x={Math.PI / 2} scale={[10, 10, 1]} />
          <Lightformer intensity={1.2} color="#8fb4ff" position={[-6, 2, 0]} rotation-y={Math.PI / 2} scale={[6, 3, 1]} />
          <Lightformer intensity={0.8} color="#ffd9a8" position={[6, 1, 3]} rotation-y={-Math.PI / 2} scale={[5, 2, 1]} />
        </Environment>
        <Package s={s} e={e} exploded={exploded} />
        <ContactShadows position={[0, -0.01, 0]} opacity={0.5} scale={30} blur={2.5} far={6} />
        <OrbitControls makeDefault autoRotate autoRotateSpeed={0.8} enablePan={false} minDistance={4} maxDistance={40} target={[0, 1.3, 0]} />
      </Canvas>
    </div>
  )
}

function Package({ s, e, exploded }: { s: ChipSpec; e: ChipEval; exploded: boolean }) {
  const L = useMemo(() => layout(s), [s.pkg, s.dieMm2, s.dies, s.hbmStacks, s.kind]) // eslint-disable-line react-hooks/exhaustive-deps
  const look = { ...DEFAULT_LOOK, ...s.look }
  const mods = new Set(s.mods ?? [])
  const explode = useRef(0)
  const root = useRef<THREE.Group>(null)
  useFrame((_, dt) => {
    explode.current += ((exploded ? 1 : 0) - explode.current) * Math.min(1, dt * 4)
    if (root.current && mods.has('ludicrous')) root.current.position.x = Math.sin(performance.now() / 30) * 0.015 // it vibrates
  })
  const fit = 5.2 / Math.max(L.sub[0], L.sub[1]) // auto-scale so any package fills the view
  const lid = mods.has('gold') ? { color: '#f0c03a', metal: 0.85, rough: 0.32 } : LID[look.lid]
  const dieColor = mods.has('round') ? '#5b6fa8' : '#4b5577'
  const heat = Math.max(0, Math.min(1, (e.wPerMm2 - 0.5) / 1.2)) * 0.35 // hotter dies glow ember-red
  const hbmH = s.kind === 'gpu' ? s.hbmHeight : 0
  const top = 0.55 + Math.max(0.35, hbmH * 0.035)
  return (
    <group ref={root} scale={fit}>
      {/* substrate with BGA dots */}
      <Layer y={0} explode={explode} gap={0}>
        <RoundedBox args={[L.sub[0], 0.18, L.sub[1]]} radius={0.06} position={[0, 0.09, 0]} castShadow receiveShadow><meshStandardMaterial color={look.substrate} roughness={0.7} /></RoundedBox>
        <Caps sub={L.sub} />
        {mods.has('rgb') && <RgbRing sub={L.sub} />}
      </Layer>
      {L.wafer ? (
        <Layer y={0.2} explode={explode} gap={0.8}>
          <mesh position={[0, 0.05, 0]} castShadow><cylinderGeometry args={[15, 15, 0.1, 96]} /><meshStandardMaterial color="#3d4466" metalness={0.8} roughness={0.25} /></mesh>
          <WaferGrid />
        </Layer>
      ) : <>
        {L.inter && <Layer y={0.18} explode={explode} gap={0.6}><mesh position={[0, 0.06, 0]} castShadow receiveShadow><boxGeometry args={[L.inter[0], 0.12, L.inter[1]]} /><meshStandardMaterial color="#8c93a3" metalness={0.7} roughness={0.25} /></mesh></Layer>}
        {s.pkg === 'soic' && <Layer y={0.3} explode={explode} gap={1.3}>{L.dies.map(([x, z, w, d], i) => <mesh key={i} position={[x, 0.04, z]} castShadow><boxGeometry args={[w * 0.96, 0.08, d * 0.96]} /><meshStandardMaterial color="#2c7a6a" metalness={0.5} roughness={0.3} /></mesh>)}</Layer>}
        <Layer y={s.pkg === 'soic' ? 0.38 : 0.3} explode={explode} gap={2}>
          {L.dies.map(([x, z, w, d], i) => mods.has('round')
            ? <mesh key={i} position={[x, 0.08, z]} castShadow><cylinderGeometry args={[Math.min(w, d) / 2, Math.min(w, d) / 2, 0.16, 48]} /><meshStandardMaterial color={dieColor} metalness={0.85} roughness={0.2} emissive="#ff4a1a" emissiveIntensity={heat} /></mesh>
            : <group key={i}><mesh position={[x, 0.08, z]} castShadow><boxGeometry args={[w, 0.16, d]} /><meshStandardMaterial color={dieColor} metalness={0.85} roughness={0.2} emissive="#ff4a1a" emissiveIntensity={heat} /></mesh>
              <mesh position={[x, 0.165, z]}><boxGeometry args={[w * s.computeFrac * 1.2, 0.005, d * 0.8]} /><meshStandardMaterial color={look.accent} emissive={look.accent} emissiveIntensity={0.35} /></mesh></group>)}
          {mods.has('vibes') && L.dies[0] && <Pulse x={L.dies[0][0] + L.dies[0][2] / 2 - 0.25} z={L.dies[0][1] - L.dies[0][3] / 2 + 0.25} />}
        </Layer>
        <Layer y={0.3} explode={explode} gap={2.6}>
          {L.hbm.map(([x, z], i) => <HbmStack key={i} x={x} z={z} layers={hbmH} rgb={mods.has('rgb')} />)}
        </Layer>
      </>}
      {/* lid / heat spreader */}
      {!L.wafer && <Layer y={top} explode={explode} gap={3.3}>
        <RoundedBox args={[L.sub[0] * 0.86, 0.14, L.sub[1] * 0.86]} radius={0.05} position={[0, 0.07, 0]} castShadow>
          <meshStandardMaterial color={lid.color} metalness={lid.metal} roughness={lid.rough} transparent={!!lid.opacity} opacity={lid.opacity ?? 1} />
        </RoundedBox>
        {mods.has('tinfoil') && <mesh position={[0, 0.7, 0]} castShadow rotation={[0, 0.4, 0.08]}><coneGeometry args={[0.9, 1.2, 7]} /><meshStandardMaterial color="#d9dde3" metalness={1} roughness={0.45} flatShading /></mesh>}
      </Layer>}
      {/* absurd garnish around the package */}
      {mods.has('espresso') && <Espresso x={L.sub[0] / 2 - 0.55} z={L.sub[1] / 2 - 0.55} />}
      {mods.has('quantum') && <Qubit r={Math.max(L.sub[0], L.sub[1]) * 0.62} />}
      {mods.has('aquarium') && <Aquarium x={-L.sub[0] / 2 - 1.1} />}
      {mods.has('duck') && <Duck x={-L.sub[0] / 2 + 0.6} z={L.sub[1] / 2 - 0.6} />}
      {mods.has('blockchain') && <Chain y={0.25} w={L.sub[0]} z={-L.sub[1] / 2 - 0.4} />}
      {mods.has('ludicrous') && <Flames sub={L.sub} />}
    </group>
  )
}

function Caps({ sub }: { sub: [number, number] }) {
  const pts = useMemo(() => { const p: [number, number][] = []; for (let i = 0; i < 14; i++) p.push([-sub[0] / 2 + 0.25 + (i * (sub[0] - 0.5)) / 13, sub[1] / 2 - 0.22]); return p }, [sub])
  return <>{pts.map(([x, z], i) => <mesh key={i} position={[x, 0.22, z]} castShadow><boxGeometry args={[0.14, 0.08, 0.08]} /><meshStandardMaterial color="#8a6b45" metalness={0.6} roughness={0.4} /></mesh>)}</>
}

function HbmStack({ x, z, layers, rgb }: { x: number; z: number; layers: number; rgb: boolean }) {
  const n = Math.max(1, layers)
  return <group position={[x, 0, z]}>{Array.from({ length: n }, (_, i) => <mesh key={i} position={[0, 0.02 + i * 0.035, 0]} castShadow>
    <boxGeometry args={[1.0, 0.03, 1.1]} /><meshStandardMaterial color={rgb ? `hsl(${(i / n) * 300}, 80%, 60%)` : i % 2 ? '#aeb4bd' : '#c4c9d0'} emissive={rgb ? `hsl(${(i / n) * 300}, 80%, 50%)` : '#000'} emissiveIntensity={rgb ? 0.6 : 0} metalness={0.7} roughness={0.3} /></mesh>)}</group>
}

function WaferGrid() {
  const m = useRef<THREE.InstancedMesh>(null)
  const cells = useMemo(() => { const c: [number, number][] = []; for (let i = -7; i <= 7; i++) for (let j = -7; j <= 7; j++) if (Math.hypot(i * 2 + 1, j * 2 + 1) < 14.2) c.push([i * 2 + 1, j * 2 + 1]); return c }, [])
  useFrame(() => { const mm = m.current; if (!mm || mm.userData.done) return; const o = new THREE.Object3D(); cells.forEach(([x, z], k) => { o.position.set(x, 0.13, z); o.updateMatrix(); mm.setMatrixAt(k, o.matrix) }); mm.instanceMatrix.needsUpdate = true; mm.userData.done = true })
  return <instancedMesh ref={m} args={[undefined, undefined, cells.length]} castShadow><boxGeometry args={[1.8, 0.06, 1.8]} /><meshStandardMaterial color="#5a6390" metalness={0.9} roughness={0.2} /></instancedMesh>
}

function RgbRing({ sub }: { sub: [number, number] }) {
  const mats = useRef<(THREE.MeshStandardMaterial | null)[]>([])
  useFrame(({ clock }) => { const c = new THREE.Color().setHSL((clock.elapsedTime * 0.25) % 1, 0.9, 0.55); for (const m of mats.current) if (m) { m.color.copy(c); m.emissive.copy(c) } })
  const t = 0.07, [W, D] = sub
  const bars: [number, number, number, number][] = [[0, -D / 2, W + t, t], [0, D / 2, W + t, t], [-W / 2, 0, t, D], [W / 2, 0, t, D]]
  return <group>{bars.map(([x, z, w, d], i) => <mesh key={i} position={[x, 0.1, z]}><boxGeometry args={[w, 0.08, d]} /><meshStandardMaterial ref={(m) => { mats.current[i] = m }} emissiveIntensity={1.6} /></mesh>)}</group>
}
function Pulse({ x, z }: { x: number; z: number }) {
  const m = useRef<THREE.Mesh>(null)
  useFrame(({ clock }) => { if (m.current) m.current.scale.setScalar(1 + Math.sin(clock.elapsedTime * 4) * 0.15) })
  return <mesh ref={m} position={[x, 0.2, z]}><boxGeometry args={[0.35, 0.06, 0.35]} /><meshStandardMaterial color="#b07cff" emissive="#9a5cff" emissiveIntensity={1.2} /></mesh>
}
function Espresso({ x, z }: { x: number; z: number }) {
  const steam = useRef<THREE.Group>(null)
  useFrame(({ clock }) => { steam.current?.children.forEach((c, i) => { const t = (clock.elapsedTime * 0.6 + i / 3) % 1; c.position.y = 0.6 + t * 1.2; c.scale.setScalar(0.4 + t); ((c as THREE.Mesh).material as THREE.MeshStandardMaterial).opacity = 0.5 * (1 - t) }) })
  return <group position={[x, 0.18, z]}>
    <mesh castShadow position={[0, 0.2, 0]}><cylinderGeometry args={[0.28, 0.22, 0.4, 24]} /><meshStandardMaterial color="#f4f1ea" roughness={0.3} /></mesh>
    <mesh position={[0, 0.39, 0]}><cylinderGeometry args={[0.25, 0.25, 0.02, 24]} /><meshStandardMaterial color="#4a2a14" /></mesh>
    <mesh position={[0.32, 0.22, 0]} rotation={[0, 0, Math.PI / 2]}><torusGeometry args={[0.1, 0.03, 8, 16]} /><meshStandardMaterial color="#f4f1ea" /></mesh>
    <group ref={steam}>{[0, 1, 2].map((i) => <mesh key={i}><sphereGeometry args={[0.12, 12, 12]} /><meshStandardMaterial color="#ffffff" transparent opacity={0.4} depthWrite={false} /></mesh>)}</group>
  </group>
}
function Qubit({ r }: { r: number }) {
  const g = useRef<THREE.Group>(null)
  useFrame(({ clock }) => { if (g.current) { g.current.rotation.y = clock.elapsedTime * 1.4; g.current.rotation.z = Math.sin(clock.elapsedTime) * 0.4 } })
  return <group ref={g} position={[0, 1.2, 0]}><mesh position={[r, 0, 0]}><sphereGeometry args={[0.22, 24, 24]} /><meshStandardMaterial color="#9ff3ff" emissive="#58e6ff" emissiveIntensity={2.2} /></mesh>
    <mesh rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[r, 0.012, 6, 96]} /><meshBasicMaterial color="#58e6ff" transparent opacity={0.35} /></mesh></group>
}
function Aquarium({ x }: { x: number }) {
  const fish = useRef<THREE.Group>(null)
  useFrame(({ clock }) => { if (fish.current) { const t = clock.elapsedTime; fish.current.position.set(Math.sin(t * 0.8) * 0.45, 0.7 + Math.sin(t * 1.7) * 0.15, Math.cos(t * 0.8) * 0.6); fish.current.rotation.y = -t * 0.8 } })
  return <group position={[x, 0, 0]}>
    <mesh position={[0, 0.7, 0]}><boxGeometry args={[1.5, 1.4, 1.9]} /><meshStandardMaterial color="#6fc3ff" transparent opacity={0.22} roughness={0.05} depthWrite={false} /></mesh>
    <mesh position={[0, 0.06, 0]}><boxGeometry args={[1.5, 0.12, 1.9]} /><meshStandardMaterial color="#e6d3a3" /></mesh>
    <group ref={fish}><mesh rotation={[0, 0, Math.PI / 2]}><coneGeometry args={[0.12, 0.38, 12]} /><meshStandardMaterial color="#ff8a3d" /></mesh><mesh position={[-0.24, 0, 0]} rotation={[0, 0, -Math.PI / 2]}><coneGeometry args={[0.1, 0.14, 3]} /><meshStandardMaterial color="#ff6a1d" /></mesh></group>
    <mesh position={[0.85, 0.35, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.05, 0.05, 0.4, 8]} /><meshStandardMaterial color="#6fc3ff" /></mesh>
  </group>
}
function Duck({ x, z }: { x: number; z: number }) {
  const g = useRef<THREE.Group>(null)
  useFrame(({ clock }) => { if (g.current) g.current.rotation.z = Math.sin(clock.elapsedTime * 3) * 0.08 })
  return <group ref={g} position={[x, 0.18, z]} scale={0.55}>
    <mesh position={[0, 0.3, 0]} castShadow><sphereGeometry args={[0.42, 20, 16]} /><meshStandardMaterial color="#ffd23f" roughness={0.4} /></mesh>
    <mesh position={[0.25, 0.75, 0]} castShadow><sphereGeometry args={[0.26, 20, 16]} /><meshStandardMaterial color="#ffd23f" roughness={0.4} /></mesh>
    <mesh position={[0.52, 0.72, 0]} rotation={[0, 0, -Math.PI / 2]}><coneGeometry args={[0.09, 0.22, 12]} /><meshStandardMaterial color="#ff8a1d" /></mesh>
    <mesh position={[0.38, 0.82, 0.14]}><sphereGeometry args={[0.04, 8, 8]} /><meshStandardMaterial color="#111" /></mesh>
  </group>
}
function Chain({ y, w, z }: { y: number; w: number; z: number }) {
  const n = Math.max(4, Math.round(w / 0.5))
  return <group position={[0, y, z]}>{Array.from({ length: n }, (_, i) => <mesh key={i} position={[-w / 2 + (i + 0.5) * (w / n), 0.12, 0]} rotation={[i % 2 ? Math.PI / 2 : 0, Math.PI / 2, 0]} castShadow>
    <torusGeometry args={[0.18, 0.05, 8, 20]} /><meshStandardMaterial color="#e2b93b" metalness={1} roughness={0.25} /></mesh>)}</group>
}
function Flames({ sub }: { sub: [number, number] }) {
  const g = useRef<THREE.Group>(null)
  useFrame(({ clock }) => { g.current?.children.forEach((c, i) => { c.scale.y = 0.7 + Math.abs(Math.sin(clock.elapsedTime * 9 + i * 1.7)) * 0.7 }) })
  const pts: [number, number][] = [[-sub[0] / 2, -sub[1] / 2], [sub[0] / 2, -sub[1] / 2], [-sub[0] / 2, sub[1] / 2], [sub[0] / 2, sub[1] / 2]]
  return <group ref={g}>{pts.map(([x, z], i) => <mesh key={i} position={[x, 0.45, z]}><coneGeometry args={[0.22, 0.8, 10]} /><meshStandardMaterial color="#ffb02e" emissive="#ff5a1f" emissiveIntensity={2} transparent opacity={0.85} /></mesh>)}</group>
}
