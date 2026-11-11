import { Select } from "./Select"
/**
 * A seat at the table for one system. Empty seats invite you to hire; filled ones show who runs it, an Auto switch,
 * one policy knob and the last few things they did. `compact` is the HQ variant; the full card sits on system screens.
 */
import { UserPlus } from 'lucide-react'
import * as M from '@sim/managers'
import { ROLES } from '@sim/people'
import { BRANCHES, type Branch } from '@sim/data/tech'
import type { System } from '@sim/types'
import { useGame, useWorld } from './store'
import { Portrait } from './art/People'

export const SYSTEM_LABEL: Record<System, string> = { facilities: 'Facilities', sales: 'Sales', people: 'People', finance: 'Finance', research: 'Research' }
const ok = { ok: true as const, value: undefined }

function Policy({ system }: { system: System }) {
  const w = useWorld(); const act = useGame((s) => s.act)
  const ap = w.autopilot[system]
  const pol = (k: string): number => ap.policy[k] ?? M.DEFAULT_POLICY[system][k] ?? 0
  const set = (k: string, v: number): void => { act((x) => M.setAutopilot(x, system, x.autopilot[system].on, { [k]: v })) }
  switch (system) {
    case 'facilities': return <label className="mc-pol"><input type="checkbox" checked={pol('green') >= 1} onChange={(e) => set('green', e.target.checked ? 1 : 0)} /> Prefer green power</label>
    case 'sales': return <label className="mc-pol">Price {Math.round(pol('margin') * 100)}% of best<input type="range" min={0.8} max={1.3} step={0.05} value={pol('margin')} onChange={(e) => set('margin', +e.target.value)} /></label>
    case 'people': return <label className="mc-pol">Keep morale above {Math.round(pol('moraleFloor') * 100)}%<input type="range" min={0.4} max={0.9} step={0.05} value={pol('moraleFloor')} onChange={(e) => set('moraleFloor', +e.target.value)} /></label>
    case 'finance': return <label className="mc-pol">Cash reserve {pol('reserveDays')} days<input type="range" min={7} max={120} step={1} value={pol('reserveDays')} onChange={(e) => set('reserveDays', +e.target.value)} /></label>
    case 'research': return <label className="mc-pol">Focus<Select value={w.managerFocus ?? ''} onChange={(e) => act((x) => e.target.value ? M.setManagerFocus(x, e.target.value as Branch) : (x.managerFocus = undefined, ok))}><option value="">Cheapest first</option>{BRANCHES.map((b) => <option key={b} value={b}>{b}</option>)}</Select></label>
  }
}

export function ManagerCard({ system, compact = false }: { system: System; compact?: boolean }) {
  const w = useWorld(); const act = useGame((s) => s.act); const go = useGame((s) => s.go)
  const m = M.managerOf(w, system)
  const ap = w.autopilot[system]
  const role = ROLES[M.ROLE_OF[system]]
  if (!m) return (
    <div className={'mc empty ' + (compact ? 'compact' : '')}>
      <span className="mc-seat"><UserPlus size={16} /></span>
      <div className="mc-main"><b>{SYSTEM_LABEL[system]}</b><span className="dim">{compact ? 'Empty seat' : role.blurb}</span></div>
      <button className="btn sm ghost" onClick={() => go('team')}>Hire</button>
    </div>
  )
  const handsOff = ap.on && ap.handsOffUntil > w.tick
  const log = w.managerLog[system]
  return (
    <div className={'mc ' + (compact ? 'compact ' : '') + (ap.on ? 'on' : '')}>
      <span className="mc-face"><Portrait seed={m.name} size={compact ? 36 : 44} /></span>
      <div className="mc-main">
        <b>{m.name}</b>
        <span className="dim">{SYSTEM_LABEL[system]} · skill {m.skill}/10</span>
      </div>
      <label className="switch" title={ap.on ? 'Autopilot on' : 'Autopilot off'}>
        <input type="checkbox" checked={ap.on} onChange={(e) => act((x) => M.setAutopilot(x, system, e.target.checked), e.target.checked ? `${m.name} takes over ${SYSTEM_LABEL[system].toLowerCase()}` : 'You’re back in charge')} />
        <i aria-hidden /><span>{ap.on ? 'Auto' : 'Manual'}</span>
      </label>
      {!compact && <div className="mc-body">
        <Policy system={system} />
        {handsOff && <p className="mc-note">Hands off for {Math.ceil((ap.handsOffUntil - w.tick) / 24)} more days — you just made a change here.</p>}
        {log.length > 0 && <ul className="mc-log">{log.slice(0, 3).map((l, i) => <li key={i}>{l}</li>)}</ul>}
      </div>}
      {compact && log[0] && <p className="mc-last">{log[0].replace(/^Day \d+ · /, '')}</p>}
    </div>
  )
}
