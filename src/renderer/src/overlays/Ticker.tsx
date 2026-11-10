/**
 * The wire, as a single hairline under the HUD. Headlines drift past like a stock tape; hover holds them still,
 * click opens that day's newspaper. With reduced motion it simply swaps one headline every six seconds.
 */
import { useEffect, useState } from 'react'
import { Newspaper } from 'lucide-react'
import { useGame, useWorld } from '../store'
import { dateOf } from '../format'
import type { NewsItem } from '@sim/types'

/** Which morning edition a story will run in: the one printed at the next midnight. */
export const editionDayOf = (n: NewsItem): number => Math.max(1, Math.ceil(n.tick / 24))

export function Ticker() {
  const w = useWorld()
  const open = useGame((s) => s.openOverlay)
  const reduce = useGame((s) => s.settings.reduceMotion)
  const items = w.news.slice(0, 10)
  const [i, setI] = useState(0)
  useEffect(() => {
    if (!reduce) return
    const t = setInterval(() => setI((x) => x + 1), 6000)
    return () => clearInterval(t)
  }, [reduce])
  if (!items.length) return <div className="ticker" />
  const one = (n: NewsItem, k: string) => (
    <button key={k} className={`tk ${n.kind}`} onClick={() => open('paper', editionDayOf(n))} title="Read in The Daily Compute">
      <i aria-hidden /><time>{dateOf(n.tick)}</time>{n.title}
    </button>
  )
  return (
    <div className="ticker" aria-label="Latest headlines">
      <button className="tk-paper" onClick={() => open('paper', null)} title="Open today’s newspaper"><Newspaper size={14} /></button>
      <div className="tk-win">
        {reduce
          ? <div className="tk-static">{one(items[i % items.length], 's')}</div>
          : <div className="tk-track" style={{ ['--tk-dur' as string]: `${Math.max(30, items.length * 7)}s` }}>
              <div className="tk-run">{items.map((n, k) => one(n, 'a' + k))}</div>
              <div className="tk-run" aria-hidden>{items.map((n, k) => one(n, 'b' + k))}</div>
            </div>}
      </div>
    </div>
  )
}
