/**
 * Developer / sandbox console. A floating instrument panel (not a modal) so you can watch the world react while you
 * poke it. Only exists when the world was created with devTools; toggled with the backtick key.
 */
import { useState } from 'react'
import { Terminal, X } from 'lucide-react'
import * as D from '@sim/dev'
import { EVENTS, triggerEvent } from '@sim/events'
import { TECHS } from '@sim/data/tech'
import { availableGpus } from '@sim/world'
import { useGame, useWorld } from '../store'
import { money } from '../format'

export function DevPanel() {
  const w = useWorld()
  const overlay = useGame((s) => s.overlay)
  const open = useGame((s) => s.openOverlay)
  const act = useGame((s) => s.act)
  const [ev, setEv] = useState(Object.keys(EVENTS)[0])
  const [siteId, setSite] = useState(w.sites[0]?.id ?? '')
  const gpus = availableGpus(w).filter((g) => !g.vcpus)
  const [gpuId, setGpu] = useState(gpus[gpus.length - 1]?.id ?? '')
  const [count, setCount] = useState(64)
  const [tech, setTech] = useState('all')
  if (overlay !== 'dev' || !w.rules.devTools) return null
  const site = w.sites.find((s) => s.id === siteId) ?? w.sites[0]
  return (
    <aside className="devpanel" aria-label="Developer panel">
      <header><Terminal size={15} /><b>Developer</b><span className="dim">sandbox tools</span><button className="icon" onClick={() => open(null)} aria-label="Close"><X size={16} /></button></header>
      <section><h5>Cash · {w.rules.infiniteCash ? 'unlimited' : money(w.cash)}</h5>
        <div className="row wrap">{[1e6, 1e9, 1e12].map((v) => <button key={v} className="btn sm" onClick={() => act((x) => D.devAddCash(x, v), `+${money(v)}`)}>+{money(v, 0)}</button>)}</div></section>
      <section><h5>Time</h5>
        <div className="row wrap">{[1, 7, 30, 365].map((d) => <button key={d} className="btn sm" onClick={() => act((x) => D.devSkipDays(x, d), `Skipped ${d} day${d === 1 ? '' : 's'}`)}>+{d}d</button>)}</div></section>
      <section><h5>Trigger an event</h5>
        <div className="row wrap">
          <select value={ev} onChange={(e) => setEv(e.target.value)}>{Object.entries(EVENTS).map(([id, e]) => <option key={id} value={id}>{e.name}</option>)}</select>
          {EVENTS[ev]?.site && <select value={site?.id ?? ''} onChange={(e) => setSite(e.target.value)}>{w.sites.length ? w.sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>) : <option value="">no sites</option>}</select>}
          <button className="btn sm pri" onClick={() => act((x) => triggerEvent(x, ev, site?.id), `${EVENTS[ev].name} triggered`)}>Fire</button>
        </div></section>
      <section><h5>Spawn servers (free, on the dock)</h5>
        <div className="row wrap">
          <select value={gpuId} onChange={(e) => setGpu(e.target.value)}>{gpus.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}</select>
          <input type="number" min={1} value={count} onChange={(e) => setCount(Math.max(1, +e.target.value || 1))} style={{ width: 80 }} />
          <button className="btn sm" disabled={!site} onClick={() => act((x) => D.devSpawnServers(x, site!.id, gpuId, count), `${count} servers on the dock`)}>Spawn</button>
        </div></section>
      <section><h5>Research</h5>
        <div className="row wrap">
          <select value={tech} onChange={(e) => setTech(e.target.value)}><option value="all">Everything</option>{TECHS.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
          <button className="btn sm" onClick={() => act((x) => D.devUnlockTech(x, tech), 'Unlocked')}>Unlock</button>
          <label className="row" style={{ gap: 6, fontSize: 12.5 }}><input type="checkbox" checked={w.rules.mult.researchSpeed >= 4} onChange={(e) => act((x) => D.devFastResearch(x, e.target.checked))} /> 4× speed</label>
        </div></section>
      <section><h5>Reputation · {w.reputation.toFixed(0)}</h5>
        <input type="range" min={0} max={100} value={w.reputation} onChange={(e) => act((x) => D.devSetReputation(x, +e.target.value))} /></section>
    </aside>
  )
}
