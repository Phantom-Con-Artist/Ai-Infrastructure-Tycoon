import { useState } from 'react'
import { FlaskRound, UserPlus } from 'lucide-react'
import { ROLES, TRAITS, createLab, firePerson, giveRaise, hirePerson, labBoost, payrollPerDay, setLabFocus, type Person, type Role } from '@sim/people'
import { BRANCHES, type Branch } from '@sim/data/tech'
import { money } from '../format'
import { useGame, useWorld } from '../store'
import { Field, Summary, Tabs } from '../ui'
import { Portrait } from '../art/People'
import * as PV from '@sim/preview'
import * as Sum from '../summaries'

export function Team() {
  const [tab, setTab] = useState<'team' | 'hiring' | 'labs'>('team')
  const w = useWorld()
  return (
    <>
      <div className="page-head"><div><div className="eyebrow">{w.people.length} people · payroll {money(payrollPerDay(w) * 365)}/yr</div><h1>Your people</h1></div><Tabs tabs={['team', 'hiring', 'labs'] as const} value={tab} onChange={setTab} /></div>
      <Summary items={Sum.teamSummary(w)} />
      {tab === 'team' && <Org />}
      {tab === 'hiring' && <Hiring />}
      {tab === 'labs' && <Labs />}
    </>
  )
}

function Stars({ n }: { n: number }) {
  return <span style={{ display: 'inline-flex', gap: 2 }}>{Array.from({ length: 10 }, (_, i) => <i key={i} style={{ width: 6, height: 6, borderRadius: 2, background: i < n ? 'var(--accent)' : 'var(--surface-3)' }} />)}</span>
}
function PersonCard({ p, actions }: { p: Person; actions: React.ReactNode }) {
  const tr = TRAITS.find((t) => t.id === p.trait)
  return (
    <div className="panel col" style={{ gap: 8, padding: 14 }}>
      <div className="row" style={{ gap: 12 }}>
        <span style={{ borderRadius: 14, overflow: 'hidden', flex: 'none' }}><Portrait seed={p.name} size={52} /></span>
        <div style={{ minWidth: 0 }}><b style={{ fontSize: 14 }}>{p.name}</b><div className="dim" style={{ fontSize: 12 }}>{ROLES[p.role].name}</div><div className="dim" style={{ fontSize: 11.5 }}>ex-{p.from}</div></div>
      </div>
      <div className="row" style={{ justifyContent: 'space-between' }}><Stars n={p.skill} />{tr && tr.name && <span className="tag b" title={tr.blurb}>{tr.name}</span>}</div>
      <div className="row" style={{ justifyContent: 'space-between', fontSize: 12.5 }}><span>{money(p.salary)}/yr</span>{p.hiredTick > 0 || p.from === 'founding team' ? <span className={p.morale < 0.45 ? 'neg' : p.morale > 0.75 ? 'pos' : 'warn'}>morale {(p.morale * 100).toFixed(0)}%</span> : null}</div>
      <div className="row" style={{ gap: 6 }}>{actions}</div>
    </div>
  )
}

function Org() {
  const w = useWorld(); const act = useGame((s) => s.act)
  return (
    <div className="col" style={{ gap: 22 }}>
      {(Object.keys(ROLES) as Role[]).map((r) => { const ps = w.people.filter((p) => p.role === r); return (
        <div key={r}>
          <div className="row" style={{ justifyContent: 'space-between', marginBottom: 10 }}><h2 style={{ margin: 0 }}>{ROLES[r].name}s <span className="tag">{ps.length}</span></h2><span className="dim" style={{ fontSize: 12.5 }}>{ROLES[r].blurb}</span></div>
          {ps.length === 0 ? <p className="dim" style={{ fontSize: 13 }}>Nobody yet. Check the hiring board.</p> :
            <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: 10 }}>{ps.sort((a, b) => b.skill - a.skill).map((p) => <PersonCard key={p.id} p={p} actions={<>
              <button className="btn sm" onClick={() => act((x) => giveRaise(x, p.id), `${p.name} got a raise`)}>Raise +15%</button>
              <button className="btn sm danger" onClick={() => void useGame.getState().confirmAct(`Let ${p.name} go?`, PV.previewFire(w, p.id), 'Let go', (x) => firePerson(x, p.id), { okMsg: `${p.name} was let go`, system: 'people' })}>Let go</button></>} />)}</div>}
        </div>) })}
    </div>
  )
}

function Hiring() {
  const w = useWorld(); const act = useGame((s) => s.act)
  return (
    <>
      <p className="dim" style={{ marginBottom: 14 }}>The board refreshes weekly. Stars cost more, and rivals will try to poach them unless they're happy (or loyal). Signing bonus is 25% of salary.</p>
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: 10 }}>
        {w.candidates.map((p) => <PersonCard key={p.id} p={p} actions={<button className="btn sm pri" onClick={() => void useGame.getState().confirmAct(`Hire ${p.name}?`, PV.previewSpend(w, p.salary * 0.25), 'Hire', (x) => hirePerson(x, p.id), { okMsg: `${p.name} hired`, system: 'people' })}><UserPlus size={13} /> Hire · {money(p.salary * 0.25)}</button>} />)}
      </div>
    </>
  )
}

function Labs() {
  const w = useWorld(); const act = useGame((s) => s.act)
  const [name, setName] = useState('Frontier Lab')
  const [focus, setFocus] = useState<Branch>('Models')
  return (
    <div className="col" style={{ gap: 14 }}>
      <div className="panel row wrap" style={{ gap: 12, alignItems: 'end' }}>
        <FlaskRound size={22} />
        <Field label="Lab name"><input type="text" value={name} onChange={(e) => setName(e.target.value)} /></Field>
        <Field label="Focus"><select value={focus} onChange={(e) => setFocus(e.target.value as Branch)}>{BRANCHES.map((b) => <option key={b} value={b}>{b}</option>)}</select></Field>
        <button className="btn pri" onClick={() => void useGame.getState().confirmAct('Open a new research lab?', PV.previewSpend(w, 20e6 * (1 + w.labs.length)), 'Open lab', (x) => createLab(x, name, focus), { okMsg: 'Lab opened' })}>Open lab · {money(20e6 * (1 + w.labs.length))}</button>
      </div>
      {w.labs.length === 0 ? <p className="dim">No labs yet. A lab focuses your researchers on one R&D branch and speeds it up.</p> :
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
          {w.labs.map((l) => <div key={l.id} className="panel col" style={{ gap: 8 }}><h3>{l.name}</h3>
            <Field label="Focus"><select value={l.focus} onChange={(e) => act((x) => setLabFocus(x, l.id, e.target.value as Branch))}>{BRANCHES.map((b) => <option key={b} value={b}>{b}</option>)}</select></Field>
            <div style={{ fontSize: 13 }}>{l.focus} research <b className="pos">×{labBoost(w, l.focus).toFixed(2)}</b> speed</div></div>)}
        </div>}
    </div>
  )
}
