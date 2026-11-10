/** The full wire as a sheet that slides over the page from the right. Urgent stories pin to the top. */
import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { useGame, useWorld } from '../store'
import { dateOf } from '../format'
import { editionDayOf } from './Ticker'
import type { NewsCategory, NewsItem } from '@sim/types'

const FILTERS: [NewsCategory | 'all', string][] = [['all', 'All'], ['mine', 'Mine'], ['market', 'Market'], ['rivals', 'Rivals'], ['incident', 'Incidents']]

export function NewsDrawer() {
  const w = useWorld()
  const overlay = useGame((s) => s.overlay)
  const open = useGame((s) => s.openOverlay)
  const lastRead = useGame((s) => s.lastReadTick)
  const markRead = useGame((s) => s.markRead)
  const [f, setF] = useState<NewsCategory | 'all'>('all')
  const shown = overlay === 'news'
  const [readMark, setReadMark] = useState(lastRead)
  useEffect(() => {
    if (!shown) return
    setReadMark(lastRead); markRead()
    const k = (e: KeyboardEvent): void => { if (e.key === 'Escape') open(null) }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shown])
  const list = w.news.filter((n) => f === 'all' || n.category === f || (f === 'market' && n.category === 'world'))
  const pinned = list.filter((n) => n.importance >= 2 && w.tick - n.tick < 24 * 7).slice(0, 3)
  const rest = list.filter((n) => !pinned.includes(n))
  const row = (n: NewsItem, i: number) => (
    <button key={n.tick + n.title + i} className={`dn ${n.kind} ${n.tick > readMark ? 'unread' : ''}`} onClick={() => open('paper', editionDayOf(n))}>
      <time>{dateOf(n.tick)}</time><b>{n.title}</b><p>{n.body}</p>
    </button>
  )
  return (
    <>
      <div className={`drawer-scrim ${shown ? 'on' : ''}`} onClick={() => open(null)} />
      <aside className={`drawer ${shown ? 'on' : ''}`} aria-hidden={!shown} aria-label="News">
        <header>
          <h4>The Wire</h4>
          <button className="btn sm ghost" onClick={() => open('paper', null)}>Today’s paper</button>
          <button className="icon" onClick={() => open(null)} aria-label="Close"><X size={18} /></button>
        </header>
        <div className="chips">{FILTERS.map(([id, l]) => <button key={id} className={f === id ? 'on' : ''} onClick={() => setF(id)}>{l}</button>)}</div>
        <div className="dn-list">
          {pinned.length > 0 && <><div className="dn-sec">Pinned</div>{pinned.map(row)}<div className="dn-sec">Latest</div></>}
          {rest.map(row)}
          {!list.length && <p className="sub" style={{ padding: 20 }}>Nothing here yet.</p>}
        </div>
      </aside>
    </>
  )
}
/** Unread count for the bell. */
export function useUnread(): number {
  const w = useWorld()
  const lastRead = useGame((s) => s.lastReadTick)
  let n = 0
  for (const x of w.news) { if (x.tick <= lastRead) break; n++ }
  return n
}
