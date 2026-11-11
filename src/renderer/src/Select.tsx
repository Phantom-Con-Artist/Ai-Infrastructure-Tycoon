import { Children, isValidElement, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactElement, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronDown } from 'lucide-react'

interface Opt { value: string; label: ReactNode; disabled?: boolean; group?: string }
interface Props {
  value: string | number
  onChange: (e: { target: { value: string } }) => void
  children?: ReactNode
  disabled?: boolean
  style?: CSSProperties
  className?: string
  title?: string
  id?: string
  'aria-label'?: string
}

/** Flatten <option> / <optgroup> children into a list so the menu is drawn by the game, not by the OS. */
function collect(children: ReactNode, group?: string, out: Opt[] = []): Opt[] {
  Children.forEach(children, (c) => {
    if (!isValidElement(c)) return
    const el = c as ReactElement<{ value?: string | number; label?: string; disabled?: boolean; children?: ReactNode }>
    if (el.type === 'optgroup') collect(el.props.children, el.props.label, out)
    else if (el.type === 'option') out.push({ value: String(el.props.value ?? el.props.children), label: el.props.children, disabled: el.props.disabled, group })
  })
  return out
}

/**
 * A drop-in replacement for the native <select>. Chromium on Linux and Windows paints native popups in the OS theme,
 * so the Electron app draws its own: same look everywhere, keyboard friendly, flips upward near the bottom edge.
 */
export function Select({ value, onChange, children, disabled, style, className, title, id, ...rest }: Props) {
  const opts = useMemo(() => collect(children), [children])
  const cur = opts.find((o) => o.value === String(value))
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const btn = useRef<HTMLButtonElement>(null), menu = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ left: number; top?: number; bottom?: number; width: number; max: number }>({ left: 0, width: 0, max: 280 })
  const uid = useId()

  const place = (): void => {
    const r = btn.current?.getBoundingClientRect(); if (!r) return
    const zoom = parseFloat(getComputedStyle(document.documentElement).zoom || '1') || 1
    const below = window.innerHeight / zoom - r.bottom / zoom, above = r.top / zoom
    const flip = below < 220 && above > below
    setPos({ left: r.left / zoom, width: r.width / zoom, max: Math.min(320, (flip ? above : below) - 16), ...(flip ? { bottom: window.innerHeight / zoom - r.top / zoom + 6 } : { top: r.bottom / zoom + 6 }) })
  }
  useLayoutEffect(() => { if (open) place() }, [open])
  useEffect(() => {
    if (!open) return
    const off = (e: MouseEvent): void => { if (!btn.current?.contains(e.target as Node) && !menu.current?.contains(e.target as Node)) setOpen(false) }
    const close = (): void => setOpen(false)
    document.addEventListener('mousedown', off); window.addEventListener('resize', close)
    document.addEventListener('scroll', place, true)
    return () => { document.removeEventListener('mousedown', off); window.removeEventListener('resize', close); document.removeEventListener('scroll', place, true) }
  }, [open])
  useEffect(() => { if (open) menu.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'nearest' }) }, [open, active])

  const pick = (o: Opt): void => { if (o.disabled) return; onChange({ target: { value: o.value } }); setOpen(false); btn.current?.focus() }
  const openMenu = (): void => { setActive(Math.max(0, opts.findIndex((o) => o.value === String(value)))); setOpen(true) }
  const step = (d: number): void => {
    let i = active
    for (let n = 0; n < opts.length; n++) { i = (i + d + opts.length) % opts.length; if (!opts[i].disabled) break }
    setActive(i)
  }
  const onKey = (e: React.KeyboardEvent): void => {
    if (!open) { if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) { e.preventDefault(); openMenu() } return }
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); setOpen(false) }
    else if (e.key === 'ArrowDown') { e.preventDefault(); step(1) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); step(-1) }
    else if (e.key === 'Home') { e.preventDefault(); setActive(0) }
    else if (e.key === 'End') { e.preventDefault(); setActive(opts.length - 1) }
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (opts[active]) pick(opts[active]) }
    else if (e.key === 'Tab') setOpen(false)
  }

  let lastGroup: string | undefined
  return (
    <>
      <button ref={btn} type="button" id={id} className={'sel ' + (className ?? '')} style={style} title={title} disabled={disabled} aria-haspopup="listbox" aria-expanded={open} aria-controls={open ? uid : undefined} aria-label={rest['aria-label']}
        onClick={() => (open ? setOpen(false) : openMenu())} onKeyDown={onKey}>
        <span className="sel-v">{cur?.label ?? '—'}</span><ChevronDown size={15} className="sel-c" aria-hidden />
      </button>
      {open && createPortal(
        <div ref={menu} id={uid} role="listbox" className="sel-menu" style={{ left: pos.left, top: pos.top, bottom: pos.bottom, minWidth: pos.width, maxHeight: pos.max }} onKeyDown={onKey}>
          {opts.map((o, i) => {
            const head = o.group && o.group !== lastGroup ? <div className="sel-group">{o.group}</div> : null
            lastGroup = o.group
            return (
              <div key={o.value + i}>
                {head}
                <div role="option" aria-selected={o.value === String(value)} aria-disabled={o.disabled} data-active={i === active} className={'sel-o' + (i === active ? ' act' : '') + (o.disabled ? ' off' : '')}
                  onMouseEnter={() => setActive(i)} onClick={() => pick(o)}>
                  <span>{o.label}</span>{o.value === String(value) && <Check size={14} />}
                </div>
              </div>
            )
          })}
        </div>, document.body)}
    </>
  )
}
