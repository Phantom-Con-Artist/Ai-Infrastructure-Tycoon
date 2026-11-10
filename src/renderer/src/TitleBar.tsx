import { useEffect, useState } from 'react'
import { useGame } from './store'

declare global { interface Window { win?: import('../../preload').WinApi } }

/** Frameless window chrome: drag region + minimise / maximise / close drawn as part of the HUD. */
export function TitleBar() {
  const [max, setMax] = useState(false)
  const w = useGame((s) => s.w)
  useEffect(() => {
    window.win?.isMaximized().then(setMax).catch(() => undefined)
    return window.win?.onState((s) => setMax(s.maximized))
  }, [])
  const close = (): void => { void useGame.getState().save('auto').finally(() => window.win?.close()) }
  return (
    <div className="titlebar" onDoubleClick={() => window.win?.toggleMaximize()}>
      <span className="t"><img src="./icon.svg" alt="" width={16} height={16} style={{ borderRadius: 4 }} />AI Infrastructure Tycoon{w ? <span className="dim" style={{ fontWeight: 500 }}>· {w.company}</span> : null}</span>
      <span className="sp" />
      <div className="winctl" onDoubleClick={(e) => e.stopPropagation()}>
        <button aria-label="Fullscreen" title="Fullscreen (F11)" onClick={() => window.win?.fullscreen()}>
          <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor"><path d="M1 4V1h3M7 1h3v3M10 7v3H7M4 10H1V7" /></svg>
        </button>
        <button aria-label="Minimize" onClick={() => window.win?.minimize()}>
          <svg width="11" height="11" viewBox="0 0 11 11" stroke="currentColor"><path d="M1 5.5h9" /></svg>
        </button>
        <button aria-label={max ? 'Restore' : 'Maximize'} onClick={() => window.win?.toggleMaximize()}>
          {max
            ? <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor"><path d="M3 3h7v7H3zM1 8V1h7" /></svg>
            : <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor"><path d="M1.5 1.5h8v8h-8z" /></svg>}
        </button>
        <button className="x" aria-label="Close" onClick={close}>
          <svg width="11" height="11" viewBox="0 0 11 11" stroke="currentColor"><path d="M1 1l9 9M10 1l-9 9" /></svg>
        </button>
      </div>
    </div>
  )
}
