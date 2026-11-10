import { useEffect, useState } from 'react'
import { ADVISORS, CORPS } from '@sim/data/lore'
import { totalItMw, valuation } from '@sim/world'
import { totalGpus } from '@sim/util'
import { dateOf, money, num } from './format'
import { SPEEDS, useGame, useWorld, type Screen } from './store'
import { Overview } from './screens/Overview'
import { Sites } from './screens/Sites'
import { Fleet } from './screens/Fleet'
import { Lab } from './screens/Lab'
import { Contracts, Finance, Research } from './screens/Business'

const NAV: [Screen, string, string][] = [
  ['overview', 'HQ', '◧'], ['sites', 'Sites', '▦'], ['fleet', 'Fleet', '▤'], ['lab', 'Lab', '◉'],
  ['contracts', 'Deals', '⇄'], ['research', 'R&D', '△'], ['finance', 'Books', '≡']
]

export function App() {
  const hasGame = useGame((s) => !!s.w)
  const tickFrame = useGame((s) => s.tickFrame)
  useEffect(() => {
    let raf = 0, last = performance.now()
    const loop = (t: number): void => { tickFrame((t - last) / 1000); last = t; raf = requestAnimationFrame(loop) }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [tickFrame])
  useEffect(() => {
    const k = (e: KeyboardEvent): void => {
      const s = useGame.getState()
      if ((e.target as HTMLElement)?.tagName === 'INPUT' || (e.target as HTMLElement)?.tagName === 'SELECT') return
      if (e.code === 'Space') { e.preventDefault(); s.setSpeed(s.speed === 0 ? 1 : 0) }
      if (e.key >= '1' && e.key <= '4') s.setSpeed(+e.key)
    }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [])
  return (<>{hasGame ? <Game /> : <Start />}<Toast /></>)
}

function Toast() {
  const t = useGame((s) => s.toast)
  return t ? <div className={'toast ' + (t.kind === 'err' ? 'err' : '')} key={t.id}>{t.msg}</div> : null
}

function Game() {
  const w = useWorld()
  const { screen, go, speed, setSpeed, save, exit } = useGame()
  const profit = (() => { const l = w.ledger.slice(-14); return l.length ? l.reduce((a, d) => a + d.revenue - d.powerCost - d.staffCost - d.opex - d.interest, 0) / l.length : 0 })()
  return (
    <div className="app">
      <nav className="nav">
        <div className="logo">AI<br />INFRA<br />TYCOON</div>
        {NAV.map(([id, label, icon]) => <button key={id} className={screen === id ? 'on' : ''} onClick={() => go(id)}><span style={{ fontSize: 18 }}>{icon}</span>{label}</button>)}
        <div className="sp" />
        <button onClick={() => save('manual')}><span style={{ fontSize: 16 }}>⤓</span>Save</button>
        <button onClick={() => { void save('auto'); exit() }}><span style={{ fontSize: 16 }}>⏻</span>Quit</button>
      </nav>
      <header className="hud">
        <div className="cell date"><span className="k">{w.company}</span><span className="v">{dateOf(w.tick)}</span></div>
        <div className="cell"><span className="k">Cash</span><span className={'v ' + (w.cash < 0 ? 'neg' : '')}>{money(w.cash)}</span></div>
        <div className="cell"><span className="k">Net / day</span><span className={'v ' + (profit >= 0 ? 'pos' : 'neg')}>{money(profit)}</span></div>
        <div className="cell"><span className="k">Valuation</span><span className="v">{money(valuation(w))}</span></div>
        <div className="cell"><span className="k">GPUs</span><span className="v">{num(totalGpus(w))}</span></div>
        <div className="cell"><span className="k">IT load</span><span className="v">{totalItMw(w).toFixed(1)} MW</span></div>
        <div className="grow" />
        <div className="speed">
          {SPEEDS.map((_, i) => <button key={i} className={speed === i ? 'on' : ''} onClick={() => setSpeed(i)} title={i === 0 ? 'Pause (Space)' : `Speed ${i}`}>{i === 0 ? '❚❚' : '▸'.repeat(i)}</button>)}
        </div>
      </header>
      <main className="main">
        {w.gameOver && <div className="panel" style={{ borderColor: 'var(--red)', marginBottom: 24 }}><h3 className="neg">Bankrupt.</h3><p className="sub">Your lenders have taken the racks. Quit to the menu and try again — preferably with fewer leveraged B2000s.</p></div>}
        {screen === 'overview' && <Overview />}
        {screen === 'sites' && <Sites />}
        {screen === 'fleet' && <Fleet />}
        {screen === 'lab' && <Lab />}
        {screen === 'contracts' && <Contracts />}
        {screen === 'research' && <Research />}
        {screen === 'finance' && <Finance />}
      </main>
      <aside className="feed">
        <h4>Wire</h4>
        {w.news.map((n, i) => <div key={i} className={'news ' + n.kind}><time>{dateOf(n.tick)}</time><b>{n.title}</b><p>{n.body}</p></div>)}
      </aside>
    </div>
  )
}

function Start() {
  const newGame = useGame((s) => s.newGame); const load = useGame((s) => s.load)
  const [company, setCompany] = useState('Hyperscale Dreams Inc.')
  const [advisor, setAdvisor] = useState('cfo')
  const [kit, setKit] = useState(true)
  const [saves, setSaves] = useState<Awaited<ReturnType<typeof window.saves.list>>>([])
  useEffect(() => { window.saves?.list().then(setSaves).catch(() => undefined) }, [])
  return (
    <div className="start">
      <div className="hero">
        <div className="gridlines" />
        <div className="ticker mono">POWER · COOLING · SILICON · TOKENS<br />{CORPS.slice(0, 6).map((c) => c.name).join(' · ')}</div>
        <div><h1>Build the<br /><em>machine</em><br />that thinks.</h1>
          <p className="sub" style={{ marginTop: 28 }}>You are the CEO of a brand-new AI infrastructure company. Pour concrete, bribe the utility, rack ten thousand GPUs, rent them to the highest bidder, then train a model good enough to eat your customers. Every watt is accounted for.</p></div>
        <div className="ticker mono">1 tick = 1 hour · scaling laws, MTBF, PUE, MFU, HBM and your own bad decisions</div>
      </div>
      <div className="form">
        <label className="f">Company name<input type="text" value={company} onChange={(e) => setCompany(e.target.value)} /></label>
        <div><h2>Pick your right hand</h2>
          <div className="advisors">{ADVISORS.map((a) => <button key={a.id} className={'adv' + (advisor === a.id ? ' on' : '')} onClick={() => setAdvisor(a.id)}><b>{a.name} <span>· {a.role}</span></b><span>{a.bio}</span><em>{a.perk}</em></button>)}</div></div>
        <label className="row" style={{ gap: 10, fontSize: 13 }}><input type="checkbox" checked={kit} onChange={(e) => setKit(e.target.checked)} /> Founder’s kit: an Oregon site, one air-cooled hall and 40 Amphibian A800 servers on order</label>
        <div className="row"><button className="btn pri" onClick={() => newGame({ company, advisor, seed: (Date.now() & 0x7fffffff) | 1, kit })}>Start company · $40M seed</button></div>
        {saves.length > 0 && <div><h2>Continue</h2><div className="col">{saves.map((s) => <button key={s.slot} className="adv" onClick={() => load(s.slot)}><b>{s.company} <span>· {s.slot}</span></b><span>{dateOf(s.tick)} · cash {money(s.cash)}</span></button>)}</div></div>}
      </div>
    </div>
  )
}
