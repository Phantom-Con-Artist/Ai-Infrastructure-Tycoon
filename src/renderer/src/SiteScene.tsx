import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { useLayoutEffect, useMemo, useRef, type ReactElement } from 'react'
import * as THREE from 'three'
import type { Hall, Site } from '@sim/types'
import { GENERATORS } from '@sim/data/hardware'
import { useGame } from './store'

const RACK_W = 0.7, RACK_D = 1.1, RACK_H = 2.2, PITCH_X = 0.95, PITCH_Z = 2.3

function layout(h: Hall): { cols: number; rows: number; w: number; d: number } {
  const cols = Math.max(2, Math.ceil(Math.sqrt(h.slots * 1.6)))
  const rows = Math.ceil(h.slots / cols)
  return { cols, rows, w: cols * PITCH_X, d: rows * PITCH_Z }
}
const tempColor = (t: number, c = new THREE.Color()): THREE.Color => {
  if (t < 30) return c.set('#9be15d').lerp(new THREE.Color('#d8ff7a'), 0)
  if (t < 38) return c.set('#f0b94d')
  return c.set('#ff5a3c')
}

function HallMesh({ hall, x }: { hall: Hall; x: number }) {
  const ref = useRef<THREE.InstancedMesh>(null)
  const ghost = useRef<THREE.InstancedMesh>(null)
  const L = useMemo(() => layout(hall), [hall.slots])
  const built = useGame.getState().w!.tick >= hall.readyTick
  const filled = hall.racks.length
  useLayoutEffect(() => {
    const m = new THREE.Matrix4(), c = new THREE.Color()
    for (let i = 0; i < hall.slots; i++) {
      const col = i % L.cols, row = Math.floor(i / L.cols)
      m.makeTranslation(x + col * PITCH_X - L.w / 2 + PITCH_X / 2, RACK_H / 2, row * PITCH_Z - L.d / 2 + PITCH_Z / 2)
      ghost.current?.setMatrixAt(i, m)
      if (i < filled) {
        ref.current?.setMatrixAt(i, m)
        ref.current?.setColorAt(i, tempColor(hall.tempC, c).multiplyScalar(0.5 + 0.5 * Math.min(1, hall.itKw / Math.max(1, hall.powerKw))))
      }
    }
    if (ref.current) { ref.current.count = filled; ref.current.instanceMatrix.needsUpdate = true; if (ref.current.instanceColor) ref.current.instanceColor.needsUpdate = true }
    if (ghost.current) ghost.current.instanceMatrix.needsUpdate = true
  })
  return (
    <group>
      <mesh position={[x, -0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[L.w + 3, L.d + 3]} /><meshStandardMaterial color={built ? '#26231e' : '#1a1815'} /></mesh>
      <instancedMesh ref={ghost} args={[undefined, undefined, hall.slots]}>
        <boxGeometry args={[RACK_W, RACK_H, RACK_D]} /><meshBasicMaterial color="#4a443a" wireframe transparent opacity={built ? 0.28 : 0.55} />
      </instancedMesh>
      <instancedMesh ref={ref} args={[undefined, undefined, hall.slots]}>
        <boxGeometry args={[RACK_W * 0.96, RACK_H * 0.98, RACK_D * 0.96]} /><meshStandardMaterial roughness={0.45} metalness={0.5} emissiveIntensity={0.25} />
      </instancedMesh>
    </group>
  )
}

function Yard({ site, z }: { site: Site; z: number }) {
  const items: ReactElement[] = []
  let i = 0
  for (const g of site.gens) {
    const x = (i - site.gens.length / 2) * 4
    const k = GENERATORS[g.kind]
    const color = { solar: '#4f8cff', wind: '#dfe8e0', gas: '#e0a24f', nuclear: '#c8a2ff', geothermal: '#d6704a', battery: '#9be15d' }[g.kind]
    const size = Math.max(1, Math.min(3.5, Math.sqrt(g.mw) * 0.6))
    items.push(
      <mesh key={g.id} position={[x, size / 2, z]}>
        {g.kind === 'wind' ? <cylinderGeometry args={[0.08, 0.14, size * 3, 8]} /> : g.kind === 'gas' || g.kind === 'nuclear' ? <cylinderGeometry args={[size * 0.5, size * 0.5, size, 20]} /> : <boxGeometry args={[size * (g.kind === 'solar' ? 2.4 : 1.2), g.kind === 'solar' ? 0.15 : size * 0.6, size]} />}
        <meshStandardMaterial color={color} roughness={0.5} metalness={0.4} transparent opacity={useGame.getState().w!.tick >= g.readyTick ? 1 : 0.3} />
      </mesh>
    )
    void k; i++
  }
  return <group>{items}</group>
}

export function SiteScene({ site }: { site: Site }) {
  const layouts = site.halls.map(layout)
  let cursor = 0
  const xs = layouts.map((l) => { const x = cursor + l.w / 2; cursor += l.w + 5; return x })
  const total = Math.max(cursor, 14)
  const centre = total / 2
  const depth = Math.max(10, ...layouts.map((l) => l.d))
  return (
    <div className="scene">
      <Canvas camera={{ position: [centre + total * 0.35, total * 0.42 + 6, depth * 0.9 + 12], fov: 38 }} dpr={[1, 1.75]}>
        <color attach="background" args={['#14120f']} />
        <fog attach="fog" args={['#14120f', 40, 140]} />
        <ambientLight intensity={0.55} />
        <directionalLight position={[20, 40, 10]} intensity={1.4} />
        <pointLight position={[centre, 6, 0]} intensity={40} color="#b6ff4a" distance={40} />
        <group position={[-centre, 0, 0]}>
          {site.halls.map((h, i) => <HallMesh key={h.id} hall={h} x={xs[i]} />)}
          <Yard site={site} z={depth / 2 + 6} />
        </group>
        <gridHelper args={[160, 80, '#2d2a24', '#201e1a']} position={[0, -0.1, 0]} />
        <OrbitControls enablePan={false} maxPolarAngle={Math.PI / 2.1} autoRotate autoRotateSpeed={0.35} target={[0, 1, 0]} />
      </Canvas>
      <div className="cap">{site.halls.length} halls · {site.gens.length} generators · drag to orbit</div>
    </div>
  )
}
