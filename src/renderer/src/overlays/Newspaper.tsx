/**
 * The Daily Compute — a broadsheet that unfolds over the game. Art direction: warm newsprint, ink rules, Newsreader
 * (a variable serif with optical sizes) for everything inside the paper and nowhere else. Five-column grid: the lead
 * spans three with an engraving, the market box and an ad sit in the right rail, secondary stories run below.
 */
import { useEffect, useMemo } from 'react'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import '@fontsource-variable/newsreader/opsz.css'
import '@fontsource-variable/newsreader/opsz-italic.css'
import './paper.css'
import { useGame, useWorld } from '../store'
import { dateOf, money } from '../format'
import { roman } from '@sim/world'
import { PaperArt } from '../art/PaperArt'
import type { Edition, NewsItem } from '@sim/types'

const ADS = [
  { h: 'Coolant Spa™', b: 'Your GPUs deserve a day off. Immersion baths from the people who brought you “the cloud”.', s: 'Frostine Chiller Co.' },
  { h: 'Need more tokens?', b: 'Tokenly sells them by the trillion. Lightly used. Mostly English.', s: 'Tokenly Wholesale' },
  { h: 'Is your model sentient?', b: 'Probably not! Call our hotline for a free, legally non-binding vibe check.', s: 'Alignment Associates LLP' },
  { h: 'Now hiring: prompt whisperers', b: 'Must speak fluent “please”. Equity paid in GPU-hours.', s: 'Hyperscale Staffing' },
  { h: 'Fiber so fast it arrives yesterday', b: 'Latency is a state of mind. Ours is zen.', s: 'Lumen-ish Networks' },
  { h: 'Lost a data center?', b: 'We find racks you forgot you bought. 30% finder’s fee.', s: 'Rackhound Recovery' }
]
const SECTION: Record<NewsItem['category'], string> = { mine: 'Company', market: 'Markets', rivals: 'Rivals', incident: 'Incidents', world: 'World' }

function Story({ n, size }: { n: NewsItem; size: 'm' | 's' }) {
  return (
    <article className={`np-story ${size}`}>
      <span className="np-kicker">{SECTION[n.category]}</span>
      <h3>{n.title}</h3>
      <p><span className="np-dateline">{dateOf(n.tick)} —</span> {n.body}</p>
    </article>
  )
}

function MarketBox({ e, company }: { e: Edition; company: string }) {
  const up = e.market.playerValChange >= 0
  return (
    <section className="np-market">
      <h4>Markets at a glance</h4>
      <table>
        <tbody>
          <tr className="you"><td>{company}</td><td>{money(e.market.playerVal)}</td><td className={up ? 'np-up' : 'np-down'}>{up ? '▲' : '▼'} {money(Math.abs(e.market.playerValChange))}</td></tr>
          {e.market.rivals.map((r) => <tr key={r.name}><td>{r.name}</td><td>{money(r.val)}</td><td /></tr>)}
        </tbody>
      </table>
      <p className="np-spot">Top-bin GPU, on demand: <b>${e.market.gpuSpot.toFixed(2)}</b>/hr</p>
    </section>
  )
}

export function Newspaper() {
  const w = useWorld()
  const overlay = useGame((s) => s.overlay)
  const day = useGame((s) => s.paperDay)
  const open = useGame((s) => s.openOverlay)
  const shown = overlay === 'paper'
  const idx = useMemo(() => {
    const i = day === null ? 0 : w.editions.findIndex((e) => e.day === day)
    return i < 0 ? 0 : i
  }, [day, w.editions])
  const e = w.editions[idx]
  const older = w.editions[idx + 1], newer = w.editions[idx - 1]
  useEffect(() => {
    if (!shown) return
    const k = (ev: KeyboardEvent): void => {
      if (ev.key === 'Escape') open(null)
      if (ev.key === 'ArrowLeft' && older) open('paper', older.day)
      if (ev.key === 'ArrowRight' && newer) open('paper', newer.day)
    }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [shown, older, newer, open])
  if (!shown) return null
  const year = e ? Math.floor(e.day / 365) + 1 : 1
  const ad = ADS[(e?.day ?? 0) % ADS.length], ad2 = ADS[((e?.day ?? 0) + 3) % ADS.length]
  return (
    <div className="np-scrim" onPointerDown={(ev) => { if (ev.target === ev.currentTarget) open(null) }}>
      <div className="np-nav">
        <button disabled={!older} onClick={() => older && open('paper', older.day)}><ChevronLeft size={16} />Older</button>
        <span>{e ? `Edition ${w.editions.length - idx} of ${w.editions.length}` : 'No editions yet'}</span>
        <button disabled={!newer} onClick={() => newer && open('paper', newer.day)}>Newer<ChevronRight size={16} /></button>
        <button className="np-x" onClick={() => open(null)} aria-label="Close newspaper"><X size={18} /></button>
      </div>
      <article className="np" key={e?.day ?? 'none'}>
        <header className="np-head">
          <div className="np-ears"><span>“All the compute that’s fit to print”</span><span>Price: 1 token</span></div>
          <h1>The Daily Compute</h1>
          <div className="np-strip"><span>Vol. {roman(year)} · No. {e ? e.day : 0}</span><span>{e ? dateOf(e.day * 24) : dateOf(w.tick)}</span><span>Forecast: warm racks, scattered outages</span></div>
        </header>
        {!e ? (
          <div className="np-empty"><h2>The presses are warming up</h2><p>Our first edition prints at midnight, game time. Unpause and come back tomorrow.</p></div>
        ) : (
          <div className="np-grid">
            <section className="np-lead">
              <span className="np-kicker">{e.slowNews ? 'Slow news day' : SECTION[e.lead.category]}</span>
              <h2>{e.lead.title}</h2>
              <figure><PaperArt category={e.lead.category} /></figure>
              <div className="np-dateline np-lead-date">{dateOf(e.lead.tick)} · Staff reporter</div>
              <p className={`np-deck ${e.lead.body.length > 240 ? 'long' : ''}`}>{e.lead.body}</p>
            </section>
            <aside className="np-rail">
              <MarketBox e={e} company={w.company} />
              <div className="np-ad"><b>{ad.h}</b><p>{ad.b}</p><small>{ad.s}</small></div>
            </aside>
            <div className="np-cols">
              {e.stories.map((n, i) => <Story key={n.tick + n.title + i} n={n} size={i < 2 ? 'm' : 's'} />)}
              {e.stories.length < 3 && <div className="np-ad tall"><b>{ad2.h}</b><p>{ad2.b}</p><small>{ad2.s}</small></div>}
            </div>
          </div>
        )}
      </article>
    </div>
  )
}
