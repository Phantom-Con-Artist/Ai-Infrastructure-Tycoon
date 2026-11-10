import { ADVISORS, corp } from '@sim/data/lore'
import { debt, fleetValue, totalItMw, trailingRevenue, valuation } from '@sim/world'
import { totalGpus } from '@sim/util'
import { money, num } from '../format'
import { useGame, useWorld } from '../store'
import { Big, Head, Spark } from '../ui'

export function Overview() {
  const w = useWorld()
  const go = useGame((s) => s.go)
  const last = w.ledger.slice(-30)
  const avg = (k: 'revenue' | 'powerCost' | 'staffCost' | 'opex' | 'interest') => (last.length ? last.reduce((a, d) => a + d[k], 0) / last.length : 0)
  const profit = avg('revenue') - avg('powerCost') - avg('staffCost') - avg('opex') - avg('interest')
  const adv = ADVISORS.find((a) => a.id === w.advisor)!
  const board = [
    ...w.competitors.map((c) => ({ name: c.name, who: corp(c.corp).name, elo: c.elo, price: c.priceMtok, you: false })),
    ...w.models.filter((m) => m.releasedByPlayer).map((m) => ({ name: m.name, who: w.company, elo: m.elo, price: m.priceMtok, you: true }))
  ].sort((a, b) => b.elo - a.elo)
  const pue = (() => { let it = 0, tot = 0; for (const s of w.sites) for (const h of s.halls) if (h.itKw > 0) { it += h.itKw; tot += h.itKw * h.pue } return it > 0 ? tot / it : 0 })()
  const first = w.sites.length === 0
  return (
    <>
      <Head title={w.company} sub={`“${adv.bio}” — ${adv.name}, ${adv.role}`} />
      {first && <div className="panel" style={{ marginBottom: 28, borderColor: 'var(--phos)' }}>
        <h3>You own nothing but a term sheet.</h3>
        <p className="sub">1) <b>Sites</b> → buy land in a region and build a hall. 2) <b>Fleet</b> → order GPU servers. 3) Install them in the hall, rent them out and watch the cash flow. Mind your power, cooling and rack density.</p>
        <div className="row" style={{ marginTop: 14 }}><button className="btn pri" onClick={() => go('sites')}>Open Sites</button></div>
      </div>}
      <div className="grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <div className="panel flat"><Big n={money(w.cash)} l="Cash" cls={w.cash < 0 ? 'neg' : ''} /></div>
        <div className="panel flat"><Big n={money(valuation(w))} l="Company valuation" /></div>
        <div className="panel flat"><Big n={money(profit)} l="Net / day (30d avg)" cls={profit >= 0 ? 'pos' : 'neg'} /></div>
        <div className="panel flat"><Big n={money(avg('revenue'))} l="Revenue / day" /></div>
        <div className="panel flat"><Big n={num(totalGpus(w))} l="GPUs" /></div>
        <div className="panel flat"><Big n={totalItMw(w).toFixed(2) + ' MW'} l="Live IT load" /></div>
        <div className="panel flat"><Big n={pue ? pue.toFixed(2) : '—'} l="Fleet PUE" /></div>
        <div className="panel flat"><Big n={money(debt(w))} l="Debt" cls={debt(w) > 0 ? 'warn' : ''} /></div>
      </div>
      <div className="row gap-l" style={{ alignItems: 'flex-start', gap: 32 }}>
        <div style={{ flex: 1 }}>
          <h2>Cash, last 120 days</h2>
          <div className="panel"><Spark w={520} h={90} data={w.ledger.slice(-120).map((d) => d.cash)} /></div>
          <h2 style={{ marginTop: 28 }}>Annualised revenue · fleet book</h2>
          <div className="panel row" style={{ gap: 40 }}><Big n={money(trailingRevenue(w))} l="Run-rate revenue" /><Big n={money(fleetValue(w))} l="Fleet resale value" /><Big n={w.reputation.toFixed(0) + '/100'} l="Reputation" /></div>
        </div>
        <div style={{ flex: 1 }}>
          <h2>Model leaderboard (Elo)</h2>
          <div className="panel"><table><thead><tr><th>#</th><th>Model</th><th>Lab</th><th className="r">Elo</th><th className="r">$/Mtok</th></tr></thead><tbody>
            {board.map((b, i) => <tr key={b.name + i} style={b.you ? { color: 'var(--phos)' } : undefined}><td className="mono">{i + 1}</td><td>{b.name}</td><td className="dim">{b.who}</td><td className="r mono">{Math.round(b.elo)}</td><td className="r mono">{b.price.toFixed(2)}</td></tr>)}
          </tbody></table></div>
        </div>
      </div>
    </>
  )
}
