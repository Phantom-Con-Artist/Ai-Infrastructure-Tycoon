import { useState } from 'react'
import * as A from '@sim/actions'
import { ADVISORS } from '@sim/data/lore'
import { TECHS } from '@sim/data/hardware'
import { committed, gpu, hallServers } from '@sim/util'
import { creditLimit, debt, SALARY } from '@sim/world'
import { dateOf, dur, money, num } from '../format'
import { useGame, useWorld } from '../store'
import { Bar, Field, Head, Num, Spark } from '../ui'

export function Contracts() {
  const w = useWorld(); const act = useGame((s) => s.act)
  const [sel, setSel] = useState<string | null>(null)
  const open = w.contracts.filter((c) => !c.accepted)
  const mine = w.contracts.filter((c) => c.accepted && !c.done)
  return (
    <>
      <Head title="Contract Training" sub="Other companies pay you to train their models on your iron. Deliver before the deadline or eat penalties. Offers scale with the size of your biggest cluster." />
      {mine.length > 0 && <><h2>In progress</h2><div className="col" style={{ marginBottom: 28 }}>{mine.map((c) => { const r = w.runs.find((x) => x.id === c.runId); return <div key={c.id} className="panel row" style={{ justifyContent: 'space-between' }}><div><b>{c.modelName}</b> for {c.customer}<div className="dim" style={{ fontSize: 12 }}>due {dateOf(c.deadlineTick)} · pays {money(c.payUsd)}</div></div><div style={{ width: 220 }}><Bar v={r ? r.flopsDone / r.flopsTotal : 0} max={1} warnAt={2} badAt={2} /><div className="mono dim" style={{ fontSize: 11 }}>{r ? dur(r.etaH) : ''} left · {w.tick > c.deadlineTick ? 'LATE' : 'on track'}</div></div></div> })}</div></>}
      <h2>Offers</h2>
      <div className="col">
        {open.length === 0 && <p className="dim">No offers right now. Check back tomorrow, or build a bigger cluster.</p>}
        {open.map((c) => <Offer key={c.id} id={c.id} open={sel === c.id} toggle={() => setSel(sel === c.id ? null : c.id)} />)}
      </div>
    </>
  )
  void act
}

function Offer({ id, open, toggle }: { id: string; open: boolean; toggle: () => void }) {
  const w = useWorld(); const act = useGame((s) => s.act)
  const c = w.contracts.find((x) => x.id === id)!
  const [siteId, setSite] = useState(w.sites[0]?.id ?? '')
  const site = w.sites.find((s) => s.id === siteId)
  const gpuIds = site ? [...new Set(site.halls.flatMap((h) => h.racks.map((r) => r.gpuId).filter(Boolean)))].filter((g) => gpu(w, g).memGB >= c.minGpuMemGB) : []
  const [gpuId, setGpu] = useState(gpuIds[0] ?? '')
  const gid = gpuIds.includes(gpuId) ? gpuId : gpuIds[0] ?? ''
  const free = site && gid ? site.halls.reduce((a, h) => a + hallServers(h, gid), 0) - committed(w, siteId, gid) : 0
  const [n, setN] = useState(16)
  const servers = Math.min(Math.max(1, n), Math.max(1, free))
  return (
    <div className="panel col">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <div><h3>{c.modelName} <span className="dim">· {c.customer}</span></h3>
          <div className="dim mono" style={{ fontSize: 12 }}>{num(c.paramsB)}B{c.moe ? ' MoE' : ''} · {c.tokensT}T tokens · ≥{c.minGpuMemGB} GB/GPU · deadline +{dur(c.deadlineTick - w.tick)} · offer expires {dateOf(c.expiresTick)}</div></div>
        <div className="row"><b className="mono pos" style={{ fontSize: 20 }}>{money(c.payUsd)}</b><button className="btn pri" onClick={toggle}>{open ? 'Close' : 'Accept…'}</button></div>
      </div>
      {open && <div className="row wrap">
        <Field label="Site"><select value={siteId} onChange={(e) => setSite(e.target.value)}>{w.sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Field>
        <Field label="GPU"><select value={gid} onChange={(e) => setGpu(e.target.value)}>{gpuIds.map((g) => <option key={g} value={g}>{gpu(w, g).name}</option>)}</select></Field>
        <Field label={`Servers ${servers} / ${free} free`}><input type="range" min={1} max={Math.max(1, free)} value={servers} onChange={(e) => setN(+e.target.value)} /></Field>
        <button className="btn pri" style={{ alignSelf: 'end' }} onClick={() => act((x) => A.acceptContract(x, id, siteId, gid, servers), 'Contract signed — training started')}>Sign & start</button>
      </div>}
    </div>
  )
}

export function Research() {
  const w = useWorld(); const act = useGame((s) => s.act)
  const cur = TECHS.find((t) => t.id === w.research.current)
  return (
    <>
      <Head title="R&D" sub={`Spend flows daily while researching. ${w.staff.researchers} researchers speed it up.`} />
      {cur && <div className="panel" style={{ marginBottom: 24 }}><b>{cur.name}</b><Bar v={w.research.progressUsd} max={cur.costUsd} warnAt={2} badAt={2} /><div className="dim mono" style={{ fontSize: 12 }}>{money(w.research.progressUsd)} / {money(cur.costUsd)}</div></div>}
      <div className="grid" style={{ gridTemplateColumns: 'repeat(2,1fr)' }}>
        {TECHS.map((t) => {
          const done = w.research.done.includes(t.id)
          const locked = !!t.requires?.some((r) => !w.research.done.includes(r))
          return (
            <div key={t.id} className="panel flat col" style={{ opacity: locked ? 0.45 : 1 }}>
              <div className="row" style={{ justifyContent: 'space-between' }}><h3>{t.name}</h3>{done ? <span className="tag g">done</span> : w.research.current === t.id ? <span className="tag a">researching</span> : null}</div>
              <div className="dim" style={{ fontSize: 12.5 }}>{t.blurb}</div>
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <span className="mono dim" style={{ fontSize: 12 }}>{money(t.costUsd)} · {t.days} d{t.requires ? ` · needs ${t.requires.join(', ')}` : ''}</span>
                {!done && w.research.current !== t.id && <button className="btn sm pri" disabled={locked} onClick={() => act((x) => A.startResearch(x, t.id), 'Research started')}>Research</button>}
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}

export function Finance() {
  const w = useWorld(); const act = useGame((s) => s.act)
  const [amt, setAmt] = useState(10)
  const last = w.ledger.slice(-14)
  return (
    <>
      <Head title="Finance & People" sub="Leverage buys GPUs; GPUs depreciate faster than you think." />
      <div className="row" style={{ alignItems: 'flex-start', gap: 28 }}>
        <div className="col" style={{ flex: 1 }}>
          <div className="panel col">
            <h2>Debt</h2>
            <div className="mono">Credit line used: {money(debt(w))} / {money(creditLimit(w))}</div>
            {w.loans.map((l) => <div key={l.id} className="row" style={{ justifyContent: 'space-between' }}><span className="mono">{money(l.principal)} @ {(l.rate * 100).toFixed(1)}%</span><button className="btn sm" onClick={() => act((x) => A.repay(x, l.id), 'Loan repaid')}>Repay</button></div>)}
            <div className="row"><Field label="Borrow ($M)"><Num value={amt} onChange={setAmt} min={1} /></Field><button className="btn pri" style={{ alignSelf: 'end' }} onClick={() => act((x) => A.borrow(x, amt * 1e6), 'Funds wired')}>Borrow</button></div>
          </div>
          <div className="panel col">
            <h2>Staff</h2>
            <table><tbody>{(Object.keys(w.staff) as (keyof typeof w.staff)[]).map((k) => (
              <tr key={k}><td style={{ textTransform: 'capitalize' }}>{k}</td><td className="mono r">{w.staff[k]}</td><td className="mono dim r">{money(SALARY[k], 0)}/yr</td>
                <td className="r"><button className="btn sm" onClick={() => act((x) => A.hire(x, k, 1))}>+1</button> <button className="btn sm" onClick={() => act((x) => A.hire(x, k, -1))}>−1</button></td></tr>))}</tbody></table>
          </div>
          <div className="panel col">
            <h2>Executive team</h2>
            <div className="advisors">{ADVISORS.map((a) => (
              <button key={a.id} className={'adv' + (w.advisor === a.id ? ' on' : '')} onClick={() => act((x) => A.setAdvisor(x, a.id))}><b>{a.name} <span>· {a.role}</span></b><span>{a.bio}</span><em>{a.perk}</em></button>
            ))}</div>
          </div>
        </div>
        <div className="col" style={{ flex: 1.2 }}>
          <div className="panel">
            <h2>Daily P&L, last 14 days</h2>
            <table><thead><tr><th>Day</th><th className="r">Revenue</th><th className="r">Power</th><th className="r">Staff</th><th className="r">Opex</th><th className="r">Capex</th></tr></thead><tbody>
              {[...last].reverse().map((d) => <tr key={d.day}><td className="mono">{d.day}</td><td className="r mono pos">{money(d.revenue)}</td><td className="r mono">{money(d.powerCost)}</td><td className="r mono">{money(d.staffCost)}</td><td className="r mono">{money(d.opex)}</td><td className="r mono dim">{money(d.capex)}</td></tr>)}
            </tbody></table>
          </div>
          <div className="panel"><h2>Revenue stream (90d)</h2><Spark w={560} h={80} data={w.ledger.slice(-90).map((d) => d.revenue)} /></div>
          <div className="panel"><h2>Footprint</h2><div className="mono">{num(w.totalTco2)} tCO₂ emitted · {num(w.totalWaterL)} L water evaporated</div></div>
        </div>
      </div>
    </>
  )
}
