/** Inertia scrolling for the main game area (Lenis). Skipped when the system asks for reduced motion. */
import { useEffect, useRef, type RefObject } from 'react'
import Lenis from 'lenis'

export function useSmoothScroll(wrapper: RefObject<HTMLElement | null>, content: RefObject<HTMLElement | null>, resetKey: string): void {
  const lenis = useRef<Lenis | null>(null)
  useEffect(() => {
    if (!wrapper.current || !content.current) return
    if (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const l = new Lenis({
      wrapper: wrapper.current, content: content.current, lerp: 0.11, wheelMultiplier: 1,
      // the 3D views zoom on the wheel, and form controls and inner scrollers keep their own behaviour
      prevent: (node) => !!(node as HTMLElement).closest?.('canvas, select, textarea, input[type=range], [data-lenis-prevent]')
    })
    lenis.current = l
    let id = requestAnimationFrame(function frame(t) { l.raf(t); id = requestAnimationFrame(frame) })
    return () => { cancelAnimationFrame(id); l.destroy(); lenis.current = null }
  }, [wrapper, content])
  // a new screen starts at the top, without animating there
  useEffect(() => { if (lenis.current) lenis.current.scrollTo(0, { immediate: true }); else wrapper.current?.scrollTo?.(0, 0) }, [resetKey, wrapper])
}
