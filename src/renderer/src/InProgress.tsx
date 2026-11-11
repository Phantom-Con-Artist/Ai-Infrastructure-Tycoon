import { AppWindow, Database, Cpu, FlaskConical, Hammer, Truck, Zap, BrainCircuit, Rocket } from 'lucide-react'
import { jobs, rushCost, type JobKind } from '@sim/progress'
import { rushJob } from '@sim/rush'
import { previewSpend } from '@sim/preview'
import { dateOf, money } from './format'
import { useGame, useWorld } from './store'

const ICON: Record<JobKind, React.ReactNode> = {
  delivery: <Truck size={15} />, build: <Hammer size={15} />, power: <Zap size={15} />, training: <BrainCircuit size={15} />, chip: <Cpu size={15} />, research: <FlaskConical size={15} />, data: <Database size={15} />, product: <AppWindow size={15} />
}

/** Time left in the unit a person would say out loud. */
const left = (h: number): string => !Number.isFinite(h) ? '—' : h < 48 ? `${Math.max(1, Math.round(h))} h` : h < 24 * 365 ? `${Math.round(h / 24)} days` : `${(h / 24 / 365).toFixed(1)} years`

/** One bar for everything the player is waiting on. Pass `kinds` to show only part of the list. */
export function InProgress({ title = 'In progress', kinds, limit = 8 }: { title?: string; kinds?: JobKind[]; limit?: number }) {
  const w = useWorld()
  const confirmAct = useGame((s) => s.confirmAct)
  const sandbox = w.rules.mode === 'sandbox'
  const all = jobs(w).filter((j) => !kinds || kinds.includes(j.kind))
  if (!all.length) return null
  const shown = all.slice(0, limit)
  return (
    <section className="panel jobs" aria-label={title}>
      <div className="row" style={{ justifyContent: 'space-between' }}><b>{title}</b><span className="dim" style={{ fontSize: 12 }}>{all.length} running{all.length > shown.length ? ` · showing the next ${shown.length}` : ''}</span></div>
      {shown.map((j) => (
        <div key={j.kind + j.id} className="job">
          <span className={'job-ic ' + j.kind}>{ICON[j.kind]}</span>
          <div className="job-main">
            <div className="job-top"><span className="job-label">{j.label}</span><span className="dim">{j.where}</span></div>
            <div className="bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(j.frac * 100)}><i style={{ width: `${j.frac * 100}%` }} /></div>
          </div>
          <div className="job-eta"><b>{left(j.hoursLeft)}</b><span className="dim">{j.endTick !== undefined ? dateOf(j.endTick) : `${Math.round(j.frac * 100)}%`}</span></div>
          {sandbox && <button className="btn sm rush" title="Sandbox only: finish this instantly for an absurd fee" onClick={() => void confirmAct('Rush ' + j.label, previewSpend(w, rushCost(j)), 'Pay and finish now', (x) => rushJob(x, j.id), { okMsg: 'Done, instantly' })}><Rocket size={13} />Rush · {money(rushCost(j))}</button>}
        </div>
      ))}
    </section>
  )
}
