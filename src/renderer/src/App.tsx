import { useEffect, useState } from 'react'
import { Users, ShoppingBag, Globe, Building2, FlaskConical, Home, LogOut, Save, Pause, Play, FastForward, ChevronsRight, Bell as BellIcon, Undo2 } from 'lucide-react'
import { totalItMw, valuation } from '@sim/world'
import { totalGpus } from '@sim/util'
import { dateOf, money, num } from './format'
import { SPEEDS, useGame, useWorld } from './store'
import { HUBS, HUB_ORDER, SCREEN_LABEL, hubOf, type Hub } from './nav'
import { Confirm } from './overlays/Confirm'
import { Ticker } from './overlays/Ticker'
import { NewsDrawer, useUnread } from './overlays/NewsDrawer'
import { Newspaper } from './overlays/Newspaper'
import { Overview } from './screens/Overview'
import { Sites } from './screens/Sites'
import { Fleet } from './screens/Fleet'
import { Lab } from './screens/Lab'
import { Silicon } from './screens/Silicon'
import { Rankings } from './screens/Rankings'
import { Studio } from './screens/Studio'
import { Web } from './screens/Web'
import { Store } from './screens/Store'
import { Team } from './screens/Team'
import { Contracts, Finance, Research } from './screens/Business'
import { TitleBar } from './TitleBar'
import { Menu } from './Menu'
import { Head } from './ui'
import { Splash } from './Splash'

const HUB_ICON: Record<Hub, React.ReactNode> = {
  hq: <Home size={20} />, build: <Building2 size={20} />, make: <FlaskConical size={20} />, sell: <ShoppingBag size={20} />, company: <Users size={20} />, world: <Globe size={20} />
}
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
  const [intro, setIntro] = useState(() => !settings.skipIntro)
  return (<>{hasGame ? <Game /> : <Menu />}<Toast />{intro && <Splash onDone={() => setIntro(false)} />}</>)
}

function Toast() {
  const t = useGame((s) => s.toast)
  const undo = useGame((s) => s.undo)
  const doUndo = useGame((s) => s.doUndo)
  if (!t && !undo) return null
  return (
    <div className={'toast ' + (t?.kind === 'err' ? 'err' : '')} key={t?.id ?? undo?.at}>
      <span>{t?.msg ?? 'Done'}</span>
      {undo && t?.kind !== 'err' && <button className="toast-undo" onClick={doUndo}><Undo2 size={14} />Undo<span className="toast-timer" /></button>}
    </div>
  )
}

function Bell() {
  const unread = useUnread()
  const open = useGame((s) => s.openOverlay)
  return (
    <button className="bell" onClick={() => open('news')} aria-label={`News, ${unread} unread`}>
      <BellIcon size={18} />{unread > 0 && <span className="badge">{unread > 99 ? '99+' : unread}</span>}
    </button>
  )
}

function Game() {
  const w = useWorld()
  const { screen, go, goHub, speed, setSpeed, save, exit, settings } = useGame()
  const hub = hubOf(screen)
  const profit = (() => { const l = w.ledger.slice(-14); return l.length ? l.reduce((a, d) => a + d.revenue - d.powerCost - d.staffCost - d.opex - d.interest, 0) / l.length : 0 })()
  const quit = (): void => { if (settings.confirmQuit) void save('auto'); exit() }
  return (
    <div className="app">
      <TitleBar />
      <nav className="nav">
        {HUB_ORDER.map((h) => <button key={h} className={hub === h ? 'on' : ''} onClick={() => goHub(h)} title={HUBS[h].blurb}>{HUB_ICON[h]}{HUBS[h].label}</button>)}
        <div className="sp" />
        <button onClick={() => save('manual')}><Save size={18} />Save</button>
        <button onClick={quit}><LogOut size={18} />Menu</button>
      </nav>
      <header className="hud">
        <div className="cell" style={{ minWidth: 150 }}><span className="k">{w.ceo}, CEO</span><span className="v">{dateOf(w.tick)}</span></div>
        <div className="cell"><span className="k">Cash</span><span className={'v ' + (w.cash < 0 ? 'neg' : '')}>{money(w.cash)}</span></div>
        <div className="cell"><span className="k">Net / day</span><span className={'v ' + (profit > 0 ? 'pos' : profit < 0 ? 'neg' : '')}>{w.ledger.length ? money(profit) : '—'}</span></div>
        <div className="cell has-pop" tabIndex={0}><span className="k">Valuation</span><span className="v">{money(valuation(w))}</span>
          <div className="pop"><div><span>GPUs</span><b>{num(totalGpus(w))}</b></div><div><span>IT load</span><b>{totalItMw(w).toFixed(2)} MW</b></div><div><span>Reputation</span><b>{w.reputation.toFixed(0)}</b></div></div>
        </div>
        {w.rules.mode === 'sandbox' && <div className="sandbox-tag" title="Sandbox game: achievements and leaderboards are off">Sandbox</div>}
        <div className="grow" />
        <div className="speed">{SPEEDS.map((_, i) => <button key={i} className={speed === i ? 'on' : ''} onClick={() => setSpeed(i)} title={i === 0 ? 'Pause (Space)' : `Speed ${i} (${i})`}>{SPEED_ICON[i]}</button>)}</div>
        <Bell />
      </header>
      <Ticker />
      <main className="main">
        {HUBS[hub].screens.length > 1 && <div className="pills" role="tablist">{HUBS[hub].screens.map((sc) => <button key={sc} role="tab" aria-selected={screen === sc} className={screen === sc ? 'on' : ''} onClick={() => go(sc)}>{SCREEN_LABEL[sc]}</button>)}</div>}
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
        {screen === 'store' && <Store />}
        {screen === 'team' && <Team />}
        {screen === 'paper' && <PaperArchive />}
      </main>
      <NewsDrawer />
      <Newspaper />
      <Confirm />
    </div>
  )
}

function PaperArchive() {
  const w = useWorld()
  const open = useGame((s) => s.openOverlay)
  return (
    <div className="archive">
      <Head title="The Daily Compute" sub={w.editions.length ? 'Back issues, newest first.' : 'The first edition prints at midnight.'} />
      <div className="archive-grid">{w.editions.map((e) => <button key={e.day} className="archive-card" onClick={() => open('paper', e.day)}><time>Day {e.day}</time><b>{e.lead.title}</b><span>{e.stories.length} more stories</span></button>)}</div>
    </div>
  )
}
