import { Cpu, FlaskConical, Hammer, Truck, Zap, BrainCircuit } from 'lucide-react'
import { jobs, type JobKind } from '@sim/progress'
import { dateOf, dur } from './format'
import { useWorld } from './store'

const ICON: Record<JobKind, React.ReactNode> = {
  delivery: <Truck size={15} />, build: <Hammer size={15} />, power: <Zap size={15} />, training: <BrainCircuit size={15} />, chip: <Cpu size={15} />, research: <FlaskConical size={15} />
}

/** One bar for everything the player is waiting on. Pass `kinds` to show only part of the list. */
export function InProgress({ title = 'In progress', kinds, limit = 8 }: { title?: string; kinds?: JobKind[]; limit?: number }) {
  const w = useWorld()
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
          <div className="job-eta"><b>{Number.isFinite(j.hoursLeft) ? dur(j.hoursLeft) : '—'}</b><span className="dim">{j.endTick !== undefined ? dateOf(j.endTick) : `${Math.round(j.frac * 100)}%`}</span></div>
        </div>
      ))}
    </section>
  )
}
