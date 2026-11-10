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
