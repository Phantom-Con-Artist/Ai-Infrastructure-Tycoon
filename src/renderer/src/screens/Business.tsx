import { Fragment, useState } from 'react'
import * as A from '@sim/actions'
import { ADVISORS } from '@sim/data/lore'
import { BRANCHES, TECHS, techCost, techDays, type Branch } from '@sim/data/tech'
import { roman } from '@sim/world'
import { committed, gpu, hallServers, hasTech } from '@sim/util'
import { creditLimit, debt, SALARY } from '@sim/world'
import { ipo } from '@sim/corporate'
import { dateOf, dur, money, num } from '../format'
import { useGame, useWorld } from '../store'
import { Advanced, Bar, Field, Head, Num, Spark, Summary } from '../ui'
import * as PV from '@sim/preview'
import * as Sum from '../summaries'
import { ManagerCard } from '../ManagerCard'

export function Contracts() {
  const w = useWorld(); const act = useGame((s) => s.act)
  const [sel, setSel] = useState<string | null>(null)
  const open = w.contracts.filter((c) => !c.accepted)
  const mine = w.contracts.filter((c) => c.accepted && !c.done)
  return (
    <>
      <Head title="Contract Training" sub="Other companies pay you to train their models on your iron. Deliver before the deadline or eat penalties. Offers scale with the size of your biggest cluster." />
      <Summary items={Sum.contractsSummary(w)} />
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
  const [branch, setBranch] = useState<Branch | 'All'>('All')
  const cur = TECHS.find((t) => t.id === w.research.current)
  const curLv = cur ? (w.research.levels[cur.id] ?? 0) : 0
  const maxTier = Math.max(...TECHS.map((t) => t.tier))
  const branches = branch === 'All' ? BRANCHES : [branch]
  const doneCount = Object.values(w.research.levels).reduce((a, b) => a + b, 0)
  const queue = w.research.queue ?? []
  return (
    <>
      <div className="page-head"><div><div className="eyebrow">{doneCount} upgrades researched · {w.staff.researchers.toFixed(1)} researchers</div><h1>Research & Development</h1>
        <p className="sub">Everything in the game unlocks here. Tiers go deeper than you can afford — on purpose. Upgrades marked ∞ can be researched forever.</p></div></div>
      <Summary items={Sum.researchSummary(w)} />
      <div style={{ marginBottom: 16 }}><ManagerCard system="research" /></div>
      {cur && <div className="panel row" style={{ marginBottom: 18, gap: 18 }}>
        <div style={{ flex: 1 }}><div className="eyebrow">Researching</div><h3>{cur.name}{cur.repeatable ? ` ${roman(curLv + 1)}` : ''}</h3>
          <div className="bar" style={{ marginTop: 8 }}><i style={{ width: `${(w.research.progressUsd / techCost(cur, curLv)) * 100}%` }} /></div></div>
        <div className="dim" style={{ fontSize: 13, textAlign: 'right' }}>{money(w.research.progressUsd)} / {money(techCost(cur, curLv))}<br />{!w.rules.infiniteCash && w.cash <= 0 ? <span className="neg">Paused: out of cash</span> : 'spend flows daily while unpaused'}</div>
      </div>}
      {queue.length > 0 && <div className="panel col" style={{ marginBottom: 18, gap: 8 }}>
        <div className="row" style={{ justifyContent: 'space-between' }}><b style={{ fontSize: 13 }}>Up next · {queue.length}</b><span className="dim" style={{ fontSize: 12 }}>Each finished tech starts the next. Nothing loses progress.</span></div>
        <div className="row wrap" style={{ gap: 6 }}>{queue.map((id, i) => { const t = TECHS.find((x) => x.id === id); return t && <span key={id + i} className="queue-chip"><i>{i + 1}</i>{t.name}
          <button className="btn sm ghost" onClick={() => act((x) => A.researchNow(x, id), `Now researching ${t.name}`, { system: 'research' })}>Start now</button>
          <button className="icon" aria-label={`Remove ${t.name}`} onClick={() => act((x) => A.dequeueResearch(x, id), 'Removed from queue', { system: 'research' })}>✕</button></span> })}</div>
      </div>}
      <div className="row wrap" style={{ gap: 6, marginBottom: 16 }}>{(['All', ...BRANCHES] as const).map((b) => <button key={b} className={'btn sm ' + (branch === b ? 'pri' : '')} onClick={() => setBranch(b)}>{b}</button>)}</div>
      <div style={{ overflowX: 'auto', paddingBottom: 12 }}>
        <div style={{ display: 'grid', gridTemplateColumns: `110px repeat(${maxTier}, minmax(210px, 1fr))`, gap: 10, minWidth: 110 + maxTier * 220 }}>
          <div />{Array.from({ length: maxTier }, (_, i) => <div key={i} className="dim" style={{ fontSize: 12, fontWeight: 600 }}>Level {i + 1}</div>)}
          {branches.map((br) => <Fragment key={br}>
            <div style={{ fontWeight: 650, fontSize: 13, paddingTop: 12 }}>{br}</div>
            {Array.from({ length: maxTier }, (_, i) => <div key={i} className="col" style={{ gap: 8, alignContent: 'start' }}>
              {TECHS.filter((t) => t.branch === br && t.tier === i + 1).map((t) => {
                const lv = w.research.levels[t.id] ?? 0
                const done = lv > 0 && !t.repeatable, maxed = !!t.repeatable?.max && lv >= t.repeatable.max
                const locked = !!t.requires?.some((r) => !w.research.done.includes(r) && r !== w.research.current && !queue.includes(r))
                const active = w.research.current === t.id
                const qpos = queue.indexOf(t.id)
                return (
                  <button key={t.id} disabled={locked || done || maxed} onClick={() => act((x) => A.startResearch(x, t.id), w.research.current ? `Queued ${t.name}` : 'Research started', { system: 'research' })}
                    style={{ textAlign: 'left', border: 0, cursor: locked || done ? 'default' : 'pointer', padding: '11px 12px', borderRadius: 14, display: 'grid', gap: 4,
                      background: done || maxed ? 'var(--accent-soft)' : active ? 'var(--ink)' : 'var(--surface)', color: active ? 'var(--surface)' : undefined,
                      boxShadow: active ? 'var(--sh-2)' : 'var(--sh-1)', opacity: locked ? 0.45 : 1, transition: 'all .25s var(--ease)' }}>
                    <div className="row" style={{ justifyContent: 'space-between', gap: 6 }}><b style={{ fontSize: 13 }}>{t.name}</b>{qpos >= 0 ? <span className="tag">#{qpos + 1} queued</span> : t.repeatable ? <span className="tag b">{lv ? roman(lv) : '∞'}</span> : done ? <span className="tag g">✓</span> : null}</div>
                    <span style={{ fontSize: 11.5, opacity: 0.75, lineHeight: 1.35 }}>{t.blurb}</span>
                    <span style={{ fontSize: 11.5, fontWeight: 600, opacity: 0.8 }}>{locked ? `Needs ${t.requires!.map((r) => TECHS.find((x) => x.id === r)?.name).join(', ')}` : done ? 'Researched' : maxed ? 'Maxed' : `${money(techCost(t, lv))} · ${techDays(t, lv)} d`}</span>
                  </button>)
              })}
            </div>)}
          </Fragment>)}
        </div>
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
      <Head title="Finance" sub="Leverage buys GPUs; GPUs depreciate faster than you think." />
      <Summary items={Sum.financeSummary(w)} />
      <div style={{ marginBottom: 16 }}><ManagerCard system="finance" /></div>
      <div className="row" style={{ alignItems: 'flex-start', gap: 28 }}>
        <div className="col" style={{ flex: 1 }}>
          <div className="panel col">
            <h2>Debt</h2>
            <div className="mono">Credit line used: {money(debt(w))} / {money(creditLimit(w))}</div>
            {w.loans.map((l) => <div key={l.id} className="row" style={{ justifyContent: 'space-between' }}><span className="mono">{money(l.principal)} @ {(l.rate * 100).toFixed(1)}%</span><button className="btn sm" onClick={() => void useGame.getState().confirmAct('Repay this loan?', PV.previewSpend(w, l.principal), 'Repay', (x) => A.repay(x, l.id), { okMsg: 'Loan repaid', system: 'finance' })}>Repay</button></div>)}
            {!w.public && <div className="row" style={{ justifyContent: 'space-between' }}><span className="dim" style={{ fontSize: 13 }}>Founder stake {(w.founderStake * 100).toFixed(0)}% · IPO sells 20% of the company</span><button className="btn sm" disabled={!hasTech(w, 'ipo')} onClick={() => void useGame.getState().confirmAct('Take the company public?', PV.previewIpo(w), 'Go public', (x) => ipo(x), { okMsg: 'Listed!' })}>IPO</button></div>}
            <div className="row"><Field label="Borrow ($M)"><Num value={amt} onChange={setAmt} min={1} /></Field><button className="btn pri" style={{ alignSelf: 'end' }} onClick={() => void useGame.getState().confirmAct(`Borrow $${amt}M?`, PV.previewLoan(w, amt * 1e6), 'Borrow', (x) => A.borrow(x, amt * 1e6), { okMsg: 'Funds wired', system: 'finance' })}>Borrow</button></div>
          </div>
          <div className="panel row" style={{ justifyContent: 'space-between' }}><span>Hiring, morale and research labs live on the <b>Team</b> screen.</span><button className="btn sm" onClick={() => useGame.getState().go('team')}>Open Team</button></div>
          <div className="panel col">
            <h2>Executive team</h2>
            <div className="advisors">{ADVISORS.map((a) => (
              <button key={a.id} className={'adv' + (w.advisor === a.id ? ' on' : '')} onClick={() => act((x) => A.setAdvisor(x, a.id))}><b>{a.name} <span>· {a.role}</span></b><span>{a.bio}</span><em>{a.perk}</em></button>
            ))}</div>
          </div>
        </div>
        <div className="col" style={{ flex: 1.2 }}>
          <div className="panel"><h2>Revenue stream (90d)</h2><Spark w={560} h={80} data={w.ledger.slice(-90).map((d) => d.revenue)} /></div>
          <Advanced title="Daily profit & loss, footprint">
          <div className="panel">
            <h2>Daily P&L, last 14 days</h2>
            <table><thead><tr><th>Day</th><th className="r">Revenue</th><th className="r">Power</th><th className="r">Staff</th><th className="r">Opex</th><th className="r">Capex</th></tr></thead><tbody>
              {[...last].reverse().map((d) => <tr key={d.day}><td className="mono">{d.day}</td><td className="r mono pos">{money(d.revenue)}</td><td className="r mono">{money(d.powerCost)}</td><td className="r mono">{money(d.staffCost)}</td><td className="r mono">{money(d.opex)}</td><td className="r mono dim">{money(d.capex)}</td></tr>)}
            </tbody></table>
          </div>
          <div className="panel"><h2>Footprint</h2><div className="mono">{num(w.totalTco2)} tCO₂ emitted · {num(w.totalWaterL)} L water evaporated</div></div>
          </Advanced>
        </div>
      </div>
    </>
  )
}
