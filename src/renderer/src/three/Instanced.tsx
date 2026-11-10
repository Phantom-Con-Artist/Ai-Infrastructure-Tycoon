import { useGLTF } from '@react-three/drei'
import { useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'

export const MODEL = (name: string): string => `models/${name}.glb`

interface Part { geometry: THREE.BufferGeometry; material: THREE.Material; local: THREE.Matrix4 }

/** Flatten a GLB scene into (geometry, material, local matrix) parts so it can be instanced. */
function useParts(url: string): Part[] {
  const { scene } = useGLTF(url)
  return useMemo(() => {
    const parts: Part[] = []
    scene.updateMatrixWorld(true)
    scene.traverse((o) => {
      const m = o as THREE.Mesh
      if (m.isMesh) parts.push({ geometry: m.geometry, material: m.material as THREE.Material, local: m.matrixWorld.clone() })
    })
    return parts
  }, [scene])
}

/** Render many copies of a GLB with one draw call per sub-mesh. */
export function InstancedGlb({ url, transforms, tint }: { url: string; transforms: THREE.Matrix4[]; tint?: THREE.Color[] }) {
  const parts = useParts(url)
  return <>{parts.map((p, i) => <PartMesh key={i} part={p} transforms={transforms} tint={i === 0 ? tint : undefined} />)}</>
}

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
for (const n of ['rack', 'server', 'crah', 'cdu', 'pdu', 'ups']) useGLTF.preload(MODEL(n))
