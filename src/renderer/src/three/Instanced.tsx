import { useGLTF } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'

export const ASSET_VERSION = 7
export const MODEL = (name: string): string => `models/${name}.glb?v=${ASSET_VERSION}`

interface Part { geometry: THREE.BufferGeometry; material: THREE.Material; local: THREE.Matrix4 }

/** Flatten a GLB scene into (geometry, material, local matrix) parts so it can be instanced. */
function useParts(url: string): Part[] {
  const { scene } = useGLTF(url)
  return useMemo(() => {
    const parts: Part[] = []
    scene.updateMatrixWorld(true)
    scene.traverse((o) => {
      const m = o as THREE.Mesh
      if (m.isMesh) parts.push({ geometry: m.geometry, material: twinkle(m.material as THREE.Material), local: m.matrixWorld.clone() })
    })
    return parts
  }, [scene])
}

/** Shared clock for animated materials; advanced by <MaterialClock/> inside a Canvas. */
export const LED_TIME = { value: 0 }
const TWINKLE = new Set(['Led', 'Port'])
/** Status LEDs twinkle with a per-instance phase (from the instance's world position), so a full hall shimmers. */
function twinkle(m: THREE.Material): THREE.Material {
  if (!TWINKLE.has(m.name) || m.userData.twinkle) return m
  const c = m.clone(); c.userData.twinkle = true
  c.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = LED_TIME
    sh.vertexShader = 'varying float vPhase;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      #ifdef USE_INSTANCING
        vPhase = instanceMatrix[3].x * 2.7 + instanceMatrix[3].z * 1.9 + instanceMatrix[3].y * 9.0;
      #else
        vPhase = 0.0;
      #endif`)
    sh.fragmentShader = 'uniform float uTime;\nvarying float vPhase;\n' + sh.fragmentShader.replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
      totalEmissiveRadiance *= 0.45 + 0.55 * step(0.35, fract(sin(floor(uTime * 3.0 + vPhase) * 12.9898 + vPhase) * 43758.5453));`)
  }
  return c
}

/** Render many copies of a GLB with one draw call per sub-mesh. */
export function InstancedGlb({ url, transforms, tint }: { url: string; transforms: THREE.Matrix4[]; tint?: THREE.Color[] }) {
  const parts = useParts(url)
  return <>{parts.map((p, i) => <PartMesh key={i} part={p} transforms={transforms} tint={tintable(p, i) ? tint : undefined} />)}</>
}

/** Only parts whose material is named "Accent" take the per-instance tint (vendor colour strips). */
const tintable = (p: Part, _i: number): boolean => p.material.name === 'Accent'

function PartMesh({ part, transforms, tint }: { part: Part; transforms: THREE.Matrix4[]; tint?: THREE.Color[] }) {
  const ref = useRef<THREE.InstancedMesh>(null)
  const cap = Math.max(1, transforms.length)
  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    const m = new THREE.Matrix4()
    transforms.forEach((t, i) => { m.multiplyMatrices(t, part.local); mesh.setMatrixAt(i, m); if (tint?.[i]) mesh.setColorAt(i, tint[i]) })
    mesh.count = transforms.length
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    mesh.computeBoundingSphere()
  })
  return <instancedMesh ref={ref} args={[part.geometry, part.material, cap]} key={cap} castShadow receiveShadow frustumCulled={false} />
}

export function at(x: number, y: number, z: number, rotY = 0, s = 1): THREE.Matrix4 {
  const m = new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), rotY), new THREE.Vector3(s, s, s))
  return m
}
for (const n of ['rack', 'server', 'blank', 'crah', 'cdu', 'pdu', 'ups']) useGLTF.preload(MODEL(n))

/** Mount once per Canvas: drives LED_TIME. */
const REDUCED = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches
export function MaterialClock() {
  useFrame((st) => { LED_TIME.value = REDUCED ? 0 : st.clock.elapsedTime })
  return null
}
