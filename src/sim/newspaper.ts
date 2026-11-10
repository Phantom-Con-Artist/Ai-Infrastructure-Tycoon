/** The Daily Compute: a morning edition printed at each game midnight from the last 24 hours of news. */
import { gpuCatalog } from './data/hardware'
import { corp } from './data/lore'
import { rentalPrice } from './market'
import { valuation } from './world'
import { yearOf } from './util'
import type { Edition, NewsItem, World } from './types'

export const EDITIONS_KEPT = 30
const STORIES = 6

function slowNewsLead(w: World): NewsItem {
  const last = w.ledger[w.ledger.length - 1]
  const gpus = last?.gpus ?? 0
  const title = gpus > 0
    ? `${w.company} hums along: ${gpus.toLocaleString('en-US')} GPUs, no drama`
    : `${w.company} quietly plans its next move`
  const body = gpus > 0
    ? 'Nothing caught fire, nobody sued, and the racks stayed warm. Analysts call it "boring, in a good way".'
    : 'No servers yet, no headlines yet. Our reporter was told to "watch this space" and is still watching.'
  return { tick: w.tick, kind: 'info', title, body, category: 'mine', importance: 0 }
}

/** Builds today's edition, puts it at the front of `w.editions` (newest first, 30 kept) and returns it. */
export function buildEdition(w: World): Edition {
  const since = w.tick - 24
  // w.news is newest-first, so a stable sort keeps newest first within each importance level.
  const today = w.news.filter((n) => n.tick > since && n.tick <= w.tick).sort((a, b) => b.importance - a.importance)
  const slowNews = today.length === 0
  const lead = slowNews ? slowNewsLead(w) : today[0]
  const stories = today.slice(1, 1 + STORIES)

  const gpus = gpuCatalog(yearOf(w.tick)).filter((g) => !g.vcpus)
  const newest = gpus[gpus.length - 1]
  const playerVal = valuation(w)
  const prev = w.editions[0]
  const rivals = [...w.rivals].filter((r) => !r.owned).sort((a, b) => b.valuation - a.valuation).slice(0, 5)
    .map((r) => ({ name: corp(r.id).name, val: r.valuation }))

  const e: Edition = {
    day: Math.floor(w.tick / 24), lead, stories, slowNews,
    market: { gpuSpot: newest ? rentalPrice(w, newest) : 0, playerVal, playerValChange: prev ? playerVal - prev.market.playerVal : 0, rivals }
  }
  w.editions.unshift(e)
  if (w.editions.length > EDITIONS_KEPT) w.editions.length = EDITIONS_KEPT
  return e
}
