import { Canvas } from '@react-three/fiber'
import { Billboard, ContactShadows, Float, OrbitControls, Text, useGLTF } from '@react-three/drei'
import { Suspense, useMemo } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import * as THREE from 'three'
import fontUrl from '@fontsource/space-grotesk/files/space-grotesk-latin-700-normal.woff?url'
import { Glyph, type LogoGlyph } from '../art/Logos'
import { MODEL } from './Instanced'

/** Resolve CSS oklch() to something three.js understands by letting the browser compute it. */
function cssColor(c: string): string {
  if (typeof document === 'undefined') return '#3aa66b'
  const el = document.createElement('div'); el.style.color = c; document.body.appendChild(el)
  const v = getComputedStyle(el).color; el.remove()
  const ctx = document.createElement('canvas').getContext('2d')!
  ctx.fillStyle = v; return ctx.fillStyle
}
function useLogoTexture(glyph: string, color: string): THREE.Texture {
  return useMemo(() => {
    const svg = renderToStaticMarkup(<Glyph glyph={glyph as LogoGlyph} color={cssColor(color)} size={256} />)
    const t = new THREE.TextureLoader().load('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"')))
    t.colorSpace = THREE.SRGBColorSpace
    return t
  }, [glyph, color])
}

function Building({ name, glyph, color }: { name: string; glyph: string; color: string }) {
  const { scene } = useGLTF(MODEL('hq'))
  useMemo(() => {
    scene.traverse((o) => {
      const m = (o as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined
      if (!m || !m.name) return
      if (m.name.startsWith('Glass')) { m.color.set('#a9cdef'); m.metalness = 0.15; m.roughness = 0.12; m.emissive.set('#5d86b5'); m.emissiveIntensity = 0.18 }
      if (m.name.startsWith('Water')) { m.color.set('#7fc3ec'); m.metalness = 0.1 }
      if (m.name.startsWith('Solar')) { m.color.set('#2b3f6e'); m.metalness = 0.3 }
      ;(o as THREE.Mesh).castShadow = true; (o as THREE.Mesh).receiveShadow = true
    })
  }, [scene])
  const logo = useLogoTexture(glyph, color)
  const tint = cssColor(color)
  const fontSize = Math.min(1.5, 17 / Math.max(6, name.length) * 1.25)
  return (
    <group>
      <primitive object={scene} />
      {/* entrance monolith: sign face at (0, 5.5, 129.6) facing +Z, 40 × 8 m */}
      <mesh position={[-14.5, 5.5, 129.62]}><planeGeometry args={[6.4, 6.4]} /><meshBasicMaterial map={logo} transparent /></mesh>
      <Text font={fontUrl} position={[3.5, 5.5, 129.63]} fontSize={Math.min(4.6, 46 / Math.max(8, name.length))} color="#1d2230" anchorX="center" anchorY="middle" maxWidth={28} letterSpacing={-0.04}>{name}</Text>
      {/* word art floating over the ring's park */}
      <Float speed={1.2} rotationIntensity={0.25} floatIntensity={2}>
        <Billboard position={[0, 46, 0]}>
          <mesh><planeGeometry args={[30, 30]} /><meshBasicMaterial map={logo} transparent side={THREE.DoubleSide} /></mesh>
          <Text font={fontUrl} position={[0, -21, 0]} fontSize={7} color={tint} anchorX="center" letterSpacing={-0.04} outlineWidth={0.25} outlineColor="#ffffff">{name}</Text>
          <pointLight color={tint} intensity={600} distance={90} />
        </Billboard>
      </Float>
    </group>
  )
}

export function HqScene({ name, glyph, color, height = 420 }: { name: string; glyph: string; color: string; height?: number }) {
  return (
    <div className="scene" style={{ height }}>
      <Canvas shadows camera={{ position: [70, 70, 300], fov: 30, far: 2000 }} dpr={[1, 1.75]}>
        <color attach="background" args={['#e9eef5']} />
        <fog attach="fog" args={['#e9eef5', 420, 900]} />
        <hemisphereLight args={['#ffffff', '#b9c4d2', 1.15]} />
        <directionalLight position={[160, 260, 140]} intensity={1.9} castShadow shadow-mapSize={[4096, 4096]} shadow-camera-left={-200} shadow-camera-right={200} shadow-camera-top={200} shadow-camera-bottom={-200} shadow-camera-far={600} shadow-bias={-0.0004} shadow-normalBias={0.6} />
        <Suspense fallback={null}>
          <Building name={name} glyph={glyph} color={color} />
          <ContactShadows position={[0, 0.02, 0]} opacity={0.25} scale={400} blur={2} far={40} resolution={1024} />
        </Suspense>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.12, 0]} receiveShadow><circleGeometry args={[900, 64]} /><meshStandardMaterial color="#dfe6ee" /></mesh>
        <OrbitControls enablePan={false} autoRotate autoRotateSpeed={0.25} maxPolarAngle={Math.PI / 2.2} minDistance={60} maxDistance={520} target={[0, 10, 40]} />
      </Canvas>
      <div className="cap">Global HQ · drag to orbit</div>
    </div>
  )
}
useGLTF.preload(MODEL('hq'))
