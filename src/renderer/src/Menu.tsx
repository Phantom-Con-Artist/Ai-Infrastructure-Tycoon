import { useEffect, useState } from 'react'
import { ArrowLeft, FolderOpen, Play, Plus, Power, Settings as Cog, Trash2 } from 'lucide-react'
import { ADVISORS } from '@sim/data/lore'
import { dateOf, money } from './format'
import { useGame } from './store'
import { saves, type SaveMeta } from './saves'
import { TitleBar } from './TitleBar'
import { HeroCampus } from './art/Illustrations'
import { Portrait } from './art/People'
import { Glyph, LOGO_COLORS, LOGO_GLYPHS, WordMark, type LogoGlyph } from './art/Logos'

type View = 'home' | 'new' | 'load' | 'settings'

export function Menu() {
  const [view, setView] = useState<View>('home')
  const [list, setList] = useState<SaveMeta[]>([])
  const refresh = (): void => { saves.list().then(setList).catch(() => setList([])) }
  useEffect(refresh, [])
  const load = useGame((s) => s.load)
  const latest = list[0]
  return (
    <div className="menu-wrap">
      <TitleBar />
      <div className="menu">
        <div className="stage">
          <div className="eyebrow">A management game about watts, silicon and hubris</div>
          <h1>Build the<br /><em>machine</em><br />that thinks.</h1>
          <HeroCampus className="illo" />
          <div className="dim" style={{ fontSize: 13, position: 'relative' }}>One tick is one hour. Every watt, every FLOP, every failed GPU is simulated.</div>
        </div>
        <div className="side">
          {view === 'home' && <>
            <MenuItem primary icon={<Play size={20} />} title="Continue" sub={latest ? `${latest.company} · ${dateOf(latest.tick)} · ${money(latest.cash)}` : 'No saved game yet'} disabled={!latest} onClick={() => latest && load(latest.slot)} />
            <MenuItem icon={<Plus size={20} />} title="New company" sub="Found a company with $40M and an empty field" onClick={() => setView('new')} />
            <MenuItem icon={<FolderOpen size={20} />} title="Load game" sub={`${list.length} save${list.length === 1 ? '' : 's'}`} disabled={!list.length} onClick={() => setView('load')} />
            <MenuItem icon={<Cog size={20} />} title="Settings" sub="Autosave, speed, motion, scale" onClick={() => setView('settings')} />
            <MenuItem icon={<Power size={20} />} title="Quit" sub="Back to reality" onClick={() => window.win?.close()} />
          </>}
          {view === 'new' && <NewCompany onBack={() => setView('home')} />}
          {view === 'load' && <LoadList list={list} onBack={() => setView('home')} onChange={refresh} />}
          {view === 'settings' && <SettingsSheet onBack={() => setView('home')} />}
        </div>
      </div>
    </div>
  )
}

function MenuItem({ icon, title, sub, onClick, disabled, primary }: { icon: React.ReactNode; title: string; sub: string; onClick: () => void; disabled?: boolean; primary?: boolean }) {
  return <button className={'menu-item' + (primary ? ' primary' : '')} disabled={disabled} onClick={onClick}><span className="ic">{icon}</span><span><b>{title}</b><span>{sub}</span></span></button>
}
const Back = ({ onClick, title }: { onClick: () => void; title: string }) => (
  <div className="row" style={{ gap: 10 }}><button className="btn sm ghost" onClick={onClick}><ArrowLeft size={14} /> Back</button><h2 style={{ margin: 0, fontSize: 20 }}>{title}</h2></div>
)

const NAMES = ['Hyperscale Dreams', 'Gigawatt Gremlins', 'Tensor & Sons', 'Petaflop Partners', 'Cooling Towers LLC', 'Overfit Industries', 'Backprop Bros', 'Synthetic Sunrise']
function NewCompany({ onBack }: { onBack: () => void }) {
  const newGame = useGame((s) => s.newGame)
  const [company, setCompany] = useState(NAMES[Math.floor(Math.random() * NAMES.length)] + ' Inc.')
  const [ceo, setCeo] = useState('Alex Mercer')
  const [advisor, setAdvisor] = useState('cfo')
  const [glyph, setGlyph] = useState<LogoGlyph>('hex')
  const [color, setColor] = useState(LOGO_COLORS[0])
  return (
    <div className="sheet">
      <Back onClick={onBack} title="Found your company" />
      <div style={{ padding: '22px 18px', borderRadius: 18, background: 'var(--surface-2)', display: 'grid', placeItems: 'center' }}><WordMark glyph={glyph} color={color} name={company || 'Your Co.'} size={26} /></div>
      <div className="row"><label className="f" style={{ flex: 1.4 }}>Company name<input type="text" value={company} maxLength={36} onChange={(e) => setCompany(e.target.value)} /></label>
        <label className="f" style={{ flex: 1 }}>CEO (you)<input type="text" value={ceo} maxLength={28} onChange={(e) => setCeo(e.target.value)} /></label></div>
      <div className="col" style={{ gap: 8 }}><span className="dim" style={{ fontSize: 12, fontWeight: 550 }}>Logo</span>
        <div className="row wrap" style={{ gap: 6 }}>{LOGO_GLYPHS.map((g) => <button key={g} className="btn sm" style={{ padding: 6, borderRadius: 12, background: g === glyph ? 'var(--surface)' : undefined, boxShadow: g === glyph ? '0 0 0 2px var(--ink)' : undefined }} onClick={() => setGlyph(g)}><Glyph glyph={g} color={color} size={30} /></button>)}</div>
        <div className="row" style={{ gap: 8 }}>{LOGO_COLORS.map((c) => <button key={c} aria-label="colour" onClick={() => setColor(c)} style={{ width: 26, height: 26, borderRadius: 99, border: 0, background: c, cursor: 'pointer', boxShadow: c === color ? '0 0 0 3px var(--surface), 0 0 0 5px ' + c : undefined }} />)}</div>
      </div>
      <div className="col" style={{ gap: 8 }}><span className="dim" style={{ fontSize: 12, fontWeight: 550 }}>Your right hand</span>
        <div className="advisors">{ADVISORS.map((a) => <button key={a.id} className={'adv' + (advisor === a.id ? ' on' : '')} onClick={() => setAdvisor(a.id)}><span className="face"><Portrait seed={a.name} /></span><b>{a.name}</b><span>{a.role}</span><em>{a.perk}</em></button>)}</div>
      </div>
      <button className="btn pri" style={{ justifySelf: 'start', padding: '12px 22px' }} onClick={() => newGame({ company: company.trim() || 'Untitled Co.', ceo: ceo.trim() || 'You', advisor, seed: (Date.now() & 0x7fffffff) | 1, logo: { glyph, color } })}>Found company · $40M seed</button>
    </div>
  )
}

function LoadList({ list, onBack, onChange }: { list: SaveMeta[]; onBack: () => void; onChange: () => void }) {
  const load = useGame((s) => s.load)
  return (
    <div className="sheet">
      <Back onClick={onBack} title="Load game" />
      {list.map((s) => (
        <div key={s.slot} className="saverow">
          <div className="grow"><b>{s.company}</b> <span className="tag">{s.slot}</span><div className="dim" style={{ fontSize: 12.5 }}>{dateOf(s.tick)} · {money(s.cash)} · saved {new Date(s.savedAt).toLocaleString()}</div></div>
          <button className="btn sm pri" onClick={() => load(s.slot)}>Load</button>
          <button className="btn sm danger" aria-label="Delete save" onClick={() => { void saves.remove(s.slot).then(onChange) }}><Trash2 size={14} /></button>
        </div>
      ))}
    </div>
  )
}

function SettingsSheet({ onBack }: { onBack: () => void }) {
  const { settings, setSettings } = useGame()
  return (
    <div className="sheet">
      <Back onClick={onBack} title="Settings" />
      <label className="f">Autosave every {settings.autosaveDays} game days<input type="range" min={7} max={120} step={1} value={settings.autosaveDays} onChange={(e) => setSettings({ autosaveDays: +e.target.value })} /></label>
      <label className="f">UI scale {Math.round(settings.uiScale * 100)}%<input type="range" min={0.8} max={1.3} step={0.05} value={settings.uiScale} onChange={(e) => setSettings({ uiScale: +e.target.value })} /></label>
      <label className="f">Speed when loading a game<select value={settings.startSpeed} onChange={(e) => setSettings({ startSpeed: +e.target.value })}><option value={0}>Paused</option><option value={1}>1× · 6 hours/s</option><option value={2}>2× · 1 day/s</option><option value={3}>3× · 1 week/s</option></select></label>
      <label className="row" style={{ fontSize: 13.5 }}><input type="checkbox" checked={settings.reduceMotion} onChange={(e) => setSettings({ reduceMotion: e.target.checked })} /> Reduce motion</label>
      <label className="row" style={{ fontSize: 13.5 }}><input type="checkbox" checked={settings.confirmQuit} onChange={(e) => setSettings({ confirmQuit: e.target.checked })} /> Save automatically when quitting to the menu</label>
    </div>
  )
}
