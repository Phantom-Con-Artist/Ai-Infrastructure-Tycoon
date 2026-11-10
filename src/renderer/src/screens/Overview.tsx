/**
 * HQ — the command deck. Art direction: the campus is the hero; beside it, a quiet "Today" rail tells you the one to
 * three things worth doing and what your managers need signed. Below: the vital numbers, your path as a horizontal
 * track next to the five manager seats, then the wider world (domination, achievements, cash, leaderboard).
 */
import { ArrowRight, Check, CircleAlert, Inbox, Sparkles } from 'lucide-react'
import { ADVISORS, corp } from '@sim/data/lore'
import { MILESTONES, currentMilestone } from '@sim/objectives'
import { debt, fleetValue, totalItMw, trailingRevenue, valuation } from '@sim/world'
import { totalGpus } from '@sim/util'
import { nextSteps, type Step } from '@sim/advisor'
import { approveInbox, rejectInbox } from '@sim/managers'
import { SYSTEMS } from '@sim/types'
import { money, num } from '../format'
import { useGame, useWorld, type Screen } from '../store'
import { Big, Spark, Summary, Term } from '../ui'
import { HqScene } from '../three/HqScene'
import { CorpLogo, WordMark, type LogoGlyph } from '../art/Logos'
import { Portrait } from '../art/People'
import { ACHIEVEMENTS, domination } from '@sim/corporate'
import { ManagerCard, SYSTEM_LABEL } from '../ManagerCard'

function goToStep(s: Step): void {
  const g = useGame.getState()
  const w = g.w!
  if (s.focus) {
    const site = w.sites.find((x) => x.id === s.focus || x.halls.some((h) => h.id === s.focus))
    if (site) g.selectSite(site.id)
  }
  g.go(s.screen as Screen)
}

function Today() {
  const w = useWorld(); const act = useGame((s) => s.act)
  const steps = nextSteps(w).filter((s) => s.id !== 'inbox')
  return (
    <div className="today">
      <div className="eyebrow">Today</div>
      {steps.length === 0 && w.inbox.length === 0 && <div className="today-calm"><Sparkles size={18} /><span>Nothing urgent. Press play and let the money compound.</span></div>}
      {steps.map((s) => (
        <button key={s.id} className={`step sev${s.severity}`} onClick={() => goToStep(s)}>
          <span className="dot" aria-hidden>{s.severity === 2 ? <CircleAlert size={14} /> : null}</span>
          <span className="txt"><b>{s.title}</b><span>{s.body}</span></span>
          <ArrowRight size={15} className="arrow" />
        </button>
      ))}
      {w.inbox.length > 0 && <>
        <div className="eyebrow" style={{ marginTop: 10 }}><Inbox size={12} /> Needs your sign-off</div>
        {w.inbox.map((it) => (
          <div key={it.id} className="req">
            <div><b>{it.title}</b><span className="dim">from your {SYSTEM_LABEL[it.system].toLowerCase()} manager</span></div>
            <div className="row" style={{ gap: 6 }}>
              <button className="btn sm ghost" onClick={() => act((x) => rejectInbox(x, it.id), 'Request declined')}>No</button>
              <button className="btn sm pri" onClick={() => void useGame.getState().confirmAct(it.title, { tier: 'severe', lines: it.lines }, 'Approve', (x) => approveInbox(x, it.id), { okMsg: 'Approved' })}>Review</button>
            </div>
          </div>
        ))}
      </>}
    </div>
  )
}

function Path() {
  const w = useWorld(); const go = useGame((s) => s.go)
  const goal = currentMilestone(w)
  const done = MILESTONES.filter((m) => m.done(w)).length
  return (
    <div className="panel path">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <div className="eyebrow">Your path · {done}/{MILESTONES.length}</div>
        {goal && <button className="btn sm pri" onClick={() => go(goal.screen as Screen)}>{goal.title} <ArrowRight size={13} /></button>}
      </div>
      <ol className="track">
        {MILESTONES.map((m) => { const d = m.done(w), cur = m === goal; return (
          <li key={m.id} className={(d ? 'done ' : '') + (cur ? 'cur' : '')} title={m.hint}>
            <span className="node">{d ? <Check size={11} /> : null}</span>
            <span className="lbl">{m.title}</span>
          </li>) })}
      </ol>
      {goal ? <p className="dim" style={{ fontSize: 13 }}>Next: <b style={{ color: 'var(--tx)' }}>{goal.title}</b> — {goal.hint}</p> : <p className="dim" style={{ fontSize: 13 }}>The guided path is done. The rest of the planet is optional.</p>}
    </div>
  )
}

export function Overview() {
  const w = useWorld()
  const last = w.ledger.slice(-30)
  const avg = (k: 'revenue' | 'powerCost' | 'staffCost' | 'opex' | 'interest') => (last.length ? last.reduce((a, d) => a + d[k], 0) / last.length : 0)
  const profit = avg('revenue') - avg('powerCost') - avg('staffCost') - avg('opex') - avg('interest')
  const adv = ADVISORS.find((a) => a.id === w.advisor)!
  const board = [
    ...w.competitors.map((c) => ({ name: c.name, corp: c.corp, who: corp(c.corp).name, elo: c.elo, price: c.priceMtok, you: false })),
    ...w.models.filter((m) => m.releasedByPlayer).map((m) => ({ name: m.name, corp: '', who: w.company, elo: m.elo, price: m.priceMtok, you: true }))
  ].sort((a, b) => b.elo - a.elo).slice(0, 8)
  const pue = (() => { let it = 0, tot = 0; for (const s of w.sites) for (const h of s.halls) if (h.itKw > 0) { it += h.itKw; tot += h.itKw * h.pue } return it > 0 ? tot / it : 0 })()
  const started = w.ledger.some((d) => d.revenue > 0)
  return (
    <div className="hq">
      <div className="page-head" style={{ alignItems: 'center' }}>
        <WordMark glyph={w.logo.glyph as LogoGlyph} color={w.logo.color} name={w.company} size={34} />
        <div className="row" style={{ gap: 10 }}><span className="dim" style={{ fontSize: 13, textAlign: 'right' }}>“{adv.bio}”<br /><b style={{ color: 'var(--tx)' }}>{adv.name}</b> · {adv.role}</span><span style={{ borderRadius: 14, overflow: 'hidden' }}><Portrait seed={adv.name} size={48} /></span></div>
      </div>

      <div className="hq-hero">
        <HqScene name={w.company} glyph={w.logo.glyph} color={w.logo.color} height={400} />
        <Today />
      </div>

      <Summary items={started ? [
        { label: 'Valuation', value: money(valuation(w)) },
        { label: 'Net per day', value: money(profit), tone: profit >= 0 ? 'pos' : 'neg', hint: 'average of 30 days' },
        { label: 'Run-rate revenue', value: money(trailingRevenue(w)), hint: 'per year at today’s pace' },
        { label: 'Compute', value: `${num(totalGpus(w))} GPUs`, hint: `${totalItMw(w).toFixed(2)} MW · PUE ${pue ? pue.toFixed(2) : '—'}` }
      ] : [
        { label: 'Seed money', value: money(w.cash), hint: 'the clock only runs when you press play' },
        { label: 'Valuation', value: money(valuation(w)) },
        { label: 'Reputation', value: `${w.reputation.toFixed(0)} / 100` }
      ]} />

      <div className="hq-mid">
        <div className="col" style={{ gap: 16 }}>
          <Path />
          <div className="panel col" style={{ gap: 10 }}>
            <div className="eyebrow">Cash, last 120 days</div>
            {w.ledger.length > 1 ? <Spark w={620} h={96} data={w.ledger.slice(-120).map((d) => d.cash)} /> : <p className="dim">The chart fills in once the clock runs.</p>}
            <div className="row" style={{ gap: 36 }}><Big n={money(fleetValue(w))} l="Fleet resale value" /><Big n={money(debt(w))} l="Debt" cls={debt(w) > 0 ? 'warn' : ''} /><Big n={w.reputation.toFixed(0)} l="Reputation / 100" /></div>
          </div>
        </div>
        <div className="panel col" style={{ gap: 8 }}>
          <div className="row" style={{ justifyContent: 'space-between' }}><div className="eyebrow">Your managers</div><span className="dim" style={{ fontSize: 12 }}>Switch a seat to Auto and it runs itself</span></div>
          {SYSTEMS.map((s) => <ManagerCard key={s} system={s} compact />)}
        </div>
      </div>

      <Domination />
      <div className="row gap-l" style={{ alignItems: 'flex-start', gap: 20, marginTop: 16 }}>
        <div style={{ flex: 1 }}>
          <h2>Model leaderboard</h2>
          <div className="panel" style={{ padding: '8px 12px' }}><table><tbody>
            {board.map((b, i) => <tr key={b.name + i} style={b.you ? { background: 'var(--accent-soft)' } : undefined}>
              <td className="dim" style={{ width: 28 }}>{i + 1}</td>
              <td style={{ width: 36 }}>{b.you ? <CorpLogoPlayer /> : <CorpLogo id={b.corp} />}</td>
              <td><b style={{ fontWeight: 600 }}>{b.name}</b><div className="dim" style={{ fontSize: 12 }}>{b.who}</div></td>
              <td className="r"><b>{Math.round(b.elo)}</b> <Term k="elo"><span className="dim" style={{ fontSize: 11 }}>Elo</span></Term><div className="dim" style={{ fontSize: 12 }}>${b.price.toFixed(2)}/Mtok</div></td></tr>)}
          </tbody></table></div>
        </div>
      </div>
    </div>
  )
}
function CorpLogoPlayer() {
  const w = useWorld()
  return <span style={{ display: 'inline-grid', placeItems: 'center', width: 28, height: 28, borderRadius: 9, background: 'var(--surface)' }}><WordMark glyph={w.logo.glyph as LogoGlyph} color={w.logo.color} name="" size={14} /></span>
}

function Domination() {
  const w = useWorld()
  const d = domination(w)
  const R = 54, C = 2 * Math.PI * R
  return (
    <div className="grid gap-l" style={{ gridTemplateColumns: 'minmax(320px, 1fr) 2fr', gap: 16 }}>
      <div className="panel row" style={{ gap: 20 }}>
        <svg width={140} height={140} viewBox="0 0 140 140" aria-label="World domination">
          <circle cx={70} cy={70} r={R} fill="oklch(0.92 0.04 230)" />
          <path d="M44 52 q10 -12 22 -6 t18 10 q6 10 -6 14 t-20 8 q-14 -2 -14 -26z M80 88 q10 -2 14 8 t-8 12 q-10 -2 -6 -20z" fill="oklch(0.7 0.12 150)" opacity={0.85} />
          <circle cx={70} cy={70} r={R} fill="none" stroke="var(--surface-3)" strokeWidth={10} />
          <circle cx={70} cy={70} r={R} fill="none" stroke="var(--accent)" strokeWidth={10} strokeDasharray={`${C * d.index} ${C}`} strokeLinecap="round" transform="rotate(-90 70 70)" style={{ transition: 'stroke-dasharray .8s var(--ease)' }} />
          <text x={70} y={76} textAnchor="middle" fontSize={20} fontWeight={750} fill="var(--tx)">{(d.index * 100).toFixed(d.index < 0.1 ? 2 : 1)}%</text>
        </svg>
        <div className="col" style={{ gap: 6 }}>
          <div className="eyebrow">World domination</div>
          <h3 style={{ fontSize: 22, fontFamily: 'var(--display)' }}>{d.stage}</h3>
          <div className="dim" style={{ fontSize: 12.5 }}>Next: {d.nextStage}</div>
          <div style={{ fontSize: 12.5, display: 'grid', gap: 2 }}>
            <span>Compute share <b>{(d.computeShare * 100).toFixed(3)}%</b></span>
            <span>AI market share <b>{(d.marketShare * 100).toFixed(2)}%</b></span>
            <span>Share of world GDP <b>{(d.gdpShare * 100).toFixed(4)}%</b></span>
          </div>
        </div>
      </div>
      <div className="panel">
        <div className="row" style={{ justifyContent: 'space-between', marginBottom: 10 }}><h3>Achievements</h3><span className="tag">{w.rules.mode === 'sandbox' ? 'off in sandbox' : `${w.achievements.length} / ${ACHIEVEMENTS.length}`}</span></div>
        <div className="row wrap" style={{ gap: 8 }}>
          {ACHIEVEMENTS.map((a) => { const got = w.achievements.includes(a.id); return (
            <span key={a.id} title={`${a.name} — ${a.desc}`} style={{ width: 44, height: 44, borderRadius: 14, display: 'grid', placeItems: 'center', fontSize: 22, background: got ? 'var(--accent-soft)' : 'var(--surface-2)', filter: got ? 'none' : 'grayscale(1)', opacity: got ? 1 : 0.4, transition: 'all .3s var(--ease)' }}>{a.icon}</span>) })}
        </div>
      </div>
    </div>
  )
}
