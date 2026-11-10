import { ArrowRight, Check } from 'lucide-react'
import { ADVISORS, corp } from '@sim/data/lore'
import { MILESTONES, currentMilestone } from '@sim/objectives'
import { debt, fleetValue, totalItMw, trailingRevenue, valuation } from '@sim/world'
import { totalGpus } from '@sim/util'
import { money, num } from '../format'
import { useGame, useWorld, type Screen } from '../store'
import { Big, Spark } from '../ui'
import { HqScene } from '../three/HqScene'
import { CorpLogo, WordMark, type LogoGlyph } from '../art/Logos'
import { Portrait } from '../art/People'
import { ACHIEVEMENTS, domination } from '@sim/corporate'

export function Overview() {
  const w = useWorld()
  const go = useGame((s) => s.go)
  const last = w.ledger.slice(-30)
  const avg = (k: 'revenue' | 'powerCost' | 'staffCost' | 'opex' | 'interest') => (last.length ? last.reduce((a, d) => a + d[k], 0) / last.length : 0)
  const profit = avg('revenue') - avg('powerCost') - avg('staffCost') - avg('opex') - avg('interest')
  const adv = ADVISORS.find((a) => a.id === w.advisor)!
  const goal = currentMilestone(w)
  const doneCount = MILESTONES.filter((m) => m.done(w)).length
  const board = [
    ...w.competitors.map((c) => ({ name: c.name, corp: c.corp, who: corp(c.corp).name, elo: c.elo, price: c.priceMtok, you: false })),
    ...w.models.filter((m) => m.releasedByPlayer).map((m) => ({ name: m.name, corp: '', who: w.company, elo: m.elo, price: m.priceMtok, you: true }))
  ].sort((a, b) => b.elo - a.elo)
  const pue = (() => { let it = 0, tot = 0; for (const s of w.sites) for (const h of s.halls) if (h.itKw > 0) { it += h.itKw; tot += h.itKw * h.pue } return it > 0 ? tot / it : 0 })()
  const started = w.ledger.some((d) => d.revenue > 0)
  return (
    <>
      <div className="page-head" style={{ alignItems: 'center' }}>
        <WordMark glyph={w.logo.glyph as LogoGlyph} color={w.logo.color} name={w.company} size={34} />
        <div className="row" style={{ gap: 10 }}><span className="dim" style={{ fontSize: 13, textAlign: 'right' }}>“{adv.bio}”<br /><b style={{ color: 'var(--tx)' }}>{adv.name}</b> · {adv.role}</span><span style={{ borderRadius: 14, overflow: 'hidden' }}><Portrait seed={adv.name} size={48} /></span></div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: goal ? '1.6fr 1fr' : '1fr', gap: 16 }}>
        <HqScene name={w.company} glyph={w.logo.glyph} color={w.logo.color} height={goal ? 440 : 380} />
        {goal && (
          <div className="panel col" style={{ alignContent: 'start', gap: 14, marginBottom: 22 }}>
            <div className="eyebrow">Your path · {doneCount}/{MILESTONES.length}</div>
            <h2 style={{ fontSize: 26, fontFamily: 'var(--display)', letterSpacing: '-.03em', margin: 0 }}>{goal.title}</h2>
            <p className="dim" style={{ marginTop: -6 }}>{goal.hint}</p>
            <div><button className="btn pri" onClick={() => go(goal.screen as Screen)}>Go <ArrowRight size={14} /></button></div>
            <div className="col" style={{ gap: 6, marginTop: 6 }}>
              {MILESTONES.map((m) => { const d = m.done(w), cur = m === goal; return (
                <div key={m.id} className="row" style={{ gap: 10, fontSize: 13.5, opacity: d || cur ? 1 : 0.45 }}>
                  <span style={{ width: 20, height: 20, borderRadius: 99, display: 'grid', placeItems: 'center', background: d ? 'var(--accent)' : cur ? 'var(--ink)' : 'var(--surface-3)', color: 'white', flex: 'none' }}>{d ? <Check size={12} /> : null}</span>
                  <span style={{ fontWeight: cur ? 650 : 500, textDecoration: d ? 'line-through' : undefined, color: d ? 'var(--tx-3)' : undefined }}>{m.title}</span>
                </div>) })}
            </div>
          </div>
        )}
      </div>

      {started && <div className="grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <div className="panel"><Big n={money(valuation(w))} l="Valuation" /></div>
        <div className="panel"><Big n={money(profit)} l="Net per day (30d)" cls={profit >= 0 ? 'pos' : 'neg'} /></div>
        <div className="panel"><Big n={money(trailingRevenue(w))} l="Run-rate revenue" /></div>
        <div className="panel"><Big n={num(totalGpus(w))} l={`GPUs · ${totalItMw(w).toFixed(2)} MW · PUE ${pue ? pue.toFixed(2) : '—'}`} /></div>
      </div>}

      <Domination />
      <div className="row gap-l" style={{ alignItems: 'flex-start', gap: 20 }}>
        <div style={{ flex: 1 }} className="col">
          {started ? <>
            <h2>Cash, last 120 days</h2>
            <div className="panel"><Spark w={560} h={110} data={w.ledger.slice(-120).map((d) => d.cash)} /></div>
            <div className="panel row" style={{ gap: 36 }}><Big n={money(fleetValue(w))} l="Fleet resale value" /><Big n={money(debt(w))} l="Debt" cls={debt(w) > 0 ? 'warn' : ''} /><Big n={w.reputation.toFixed(0)} l="Reputation / 100" /></div>
          </> : <div className="panel"><Big n={money(w.cash)} l="Seed money in the bank. The clock only runs when you press play." /></div>}
        </div>
        <div style={{ flex: 1 }}>
          <h2>Model leaderboard</h2>
          <div className="panel" style={{ padding: '8px 12px' }}><table><tbody>
            {board.map((b, i) => <tr key={b.name + i} style={b.you ? { background: 'var(--accent-soft)' } : undefined}>
              <td className="dim" style={{ width: 28 }}>{i + 1}</td>
              <td style={{ width: 36 }}>{b.you ? <CorpLogoPlayer /> : <CorpLogo id={b.corp} />}</td>
              <td><b style={{ fontWeight: 600 }}>{b.name}</b><div className="dim" style={{ fontSize: 12 }}>{b.who}</div></td>
              <td className="r"><b>{Math.round(b.elo)}</b><div className="dim" style={{ fontSize: 12 }}>${b.price.toFixed(2)}/Mtok</div></td></tr>)}
          </tbody></table></div>
        </div>
      </div>
    </>
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
        <div className="row" style={{ justifyContent: 'space-between', marginBottom: 10 }}><h3>Achievements</h3><span className="tag">{w.achievements.length} / {ACHIEVEMENTS.length}</span></div>
        <div className="row wrap" style={{ gap: 8 }}>
          {ACHIEVEMENTS.map((a) => { const got = w.achievements.includes(a.id); return (
            <span key={a.id} title={`${a.name} — ${a.desc}`} style={{ width: 44, height: 44, borderRadius: 14, display: 'grid', placeItems: 'center', fontSize: 22, background: got ? 'var(--accent-soft)' : 'var(--surface-2)', filter: got ? 'none' : 'grayscale(1)', opacity: got ? 1 : 0.4, transition: 'all .3s var(--ease)' }}>{a.icon}</span>) })}
        </div>
      </div>
    </div>
  )
}
