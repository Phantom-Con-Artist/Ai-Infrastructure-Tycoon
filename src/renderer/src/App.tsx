import { useEffect } from 'react'
import { Globe, Clapperboard, Trophy, Microchip, BookOpen, Building2, FlaskConical, Handshake, Home, LogOut, Save, Server, Lightbulb, Pause, Play, FastForward, ChevronsRight } from 'lucide-react'
import { totalItMw, valuation } from '@sim/world'
import { totalGpus } from '@sim/util'
import { dateOf, money, num } from './format'
import { SPEEDS, useGame, useWorld, type Screen } from './store'
import { Overview } from './screens/Overview'
import { Sites } from './screens/Sites'
import { Fleet } from './screens/Fleet'
import { Lab } from './screens/Lab'
import { Silicon } from './screens/Silicon'
import { Rankings } from './screens/Rankings'
import { Studio } from './screens/Studio'
import { Web } from './screens/Web'
import { Contracts, Finance, Research } from './screens/Business'
import { TitleBar } from './TitleBar'
import { Menu } from './Menu'

const NAV: [Screen, string, React.ReactNode][] = [
  ['overview', 'HQ', <Home size={20} key="h" />], ['sites', 'Sites', <Building2 size={20} key="s" />], ['fleet', 'Fleet', <Server size={20} key="f" />], ['silicon', 'Silicon', <Microchip size={20} key="c" />],
  ['lab', 'Lab', <FlaskConical size={20} key="l" />], ['contracts', 'Deals', <Handshake size={20} key="d" />], ['research', 'R&D', <Lightbulb size={20} key="r" />],
  ['finance', 'Books', <BookOpen size={20} key="b" />], ['rankings', 'Ranks', <Trophy size={20} key="t" />], ['studio', 'Studio', <Clapperboard size={20} key="v" />], ['web', 'Web', <Globe size={20} key="wb" />]
]
const SPEED_ICON = [<Pause size={15} key="0" />, <Play size={14} key="1" />, <ChevronsRight size={16} key="2" />, <FastForward size={15} key="3" />, <span key="4" style={{ fontWeight: 700 }}>×4</span>]

export function App() {
  const hasGame = useGame((s) => !!s.w)
  const tickFrame = useGame((s) => s.tickFrame)
  const settings = useGame((s) => s.settings)
  useEffect(() => {
    document.documentElement.style.zoom = String(settings.uiScale)
    document.documentElement.classList.toggle('reduce-motion', settings.reduceMotion)
  }, [settings.uiScale, settings.reduceMotion])
  useEffect(() => {
    let raf = 0, last = performance.now()
    const loop = (t: number): void => { tickFrame((t - last) / 1000); last = t; raf = requestAnimationFrame(loop) }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [tickFrame])
  useEffect(() => {
    const k = (e: KeyboardEvent): void => {
      const s = useGame.getState()
      if (e.key === 'F11') { e.preventDefault(); window.win?.fullscreen() }
      if (!s.w || ['INPUT', 'SELECT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return
      if (e.code === 'Space') { e.preventDefault(); s.setSpeed(s.speed === 0 ? 1 : 0) }
      if (!e.altKey && e.key >= '1' && e.key <= '4') s.setSpeed(+e.key)
    }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [])
  return (<>{hasGame ? <Game /> : <Menu />}<Toast /></>)
}

function Toast() {
  const t = useGame((s) => s.toast)
  return t ? <div className={'toast ' + (t.kind === 'err' ? 'err' : '')} key={t.id}>{t.msg}</div> : null
}

function Game() {
  const w = useWorld()
  const { screen, go, speed, setSpeed, save, exit, settings } = useGame()
  const profit = (() => { const l = w.ledger.slice(-14); return l.length ? l.reduce((a, d) => a + d.revenue - d.powerCost - d.staffCost - d.opex - d.interest, 0) / l.length : 0 })()
  const quit = (): void => { if (settings.confirmQuit) void save('auto'); exit() }
  return (
    <div className="app">
      <TitleBar />
      <nav className="nav">
        {NAV.map(([id, label, icon]) => <button key={id} className={screen === id ? 'on' : ''} onClick={() => go(id)}>{icon}{label}</button>)}
        <div className="sp" />
        <button onClick={() => save('manual')}><Save size={18} />Save</button>
        <button onClick={quit}><LogOut size={18} />Menu</button>
      </nav>
      <header className="hud">
        <div className="cell" style={{ minWidth: 150 }}><span className="k">{w.ceo}, CEO</span><span className="v">{dateOf(w.tick)}</span></div>
        <div className="cell"><span className="k">Cash</span><span className={'v ' + (w.cash < 0 ? 'neg' : '')}>{money(w.cash)}</span></div>
        <div className="cell"><span className="k">Net / day</span><span className={'v ' + (profit > 0 ? 'pos' : profit < 0 ? 'neg' : '')}>{w.ledger.length ? money(profit) : '—'}</span></div>
        <div className="cell"><span className="k">Valuation</span><span className="v">{money(valuation(w))}</span></div>
        <div className="cell"><span className="k">GPUs</span><span className="v">{num(totalGpus(w))}</span></div>
        <div className="cell"><span className="k">IT load</span><span className="v">{totalItMw(w).toFixed(2)} MW</span></div>
        <div className="grow" />
        <div className="speed">{SPEEDS.map((_, i) => <button key={i} className={speed === i ? 'on' : ''} onClick={() => setSpeed(i)} title={i === 0 ? 'Pause (Space)' : `Speed ${i} (${i})`}>{SPEED_ICON[i]}</button>)}</div>
      </header>
      <main className="main">
        {w.gameOver && <div className="panel" style={{ background: 'var(--red-soft)', marginBottom: 20 }}><h3 className="neg">Bankrupt.</h3><p className="sub">Your lenders have taken the racks. Head back to the menu and try again.</p></div>}
        {screen === 'overview' && <Overview />}
        {screen === 'sites' && <Sites />}
        {screen === 'fleet' && <Fleet />}
        {screen === 'silicon' && <Silicon />}
        {screen === 'lab' && <Lab />}
        {screen === 'contracts' && <Contracts />}
        {screen === 'research' && <Research />}
        {screen === 'finance' && <Finance />}
        {screen === 'rankings' && <Rankings />}
        {screen === 'studio' && <Studio />}
        {screen === 'web' && <Web />}
      </main>
      <aside className="feed">
        <h4>The Wire <span className="tag">{w.news.length}</span></h4>
        {w.news.map((n, i) => <div key={n.tick + n.title + i} className={'news ' + n.kind}><time>{dateOf(n.tick)}</time><b>{n.title}</b><p>{n.body}</p></div>)}
      </aside>
    </div>
  )
}
