import { region } from './data/hardware'
import { DATASETS } from './models'
import { pick, rnd, range } from './rng'
import type { Site, World } from './types'
import { newId, pushNews } from './util'

type R = { ok: true; value: undefined } | { ok: false; error: string }
export interface EventDef { name: string; site: boolean; fire: (w: World, s?: Site) => void }

const legalRisk = (w: World): number => Object.keys(w.datasets ?? {}).reduce((a, id) => a + (DATASETS.find((d) => d.id === id)?.legalRisk ?? 0), 0)

/** Every random event, by id. The daily roll decides *whether*; these decide *what happens*. Dev tools fire them directly. */
export const EVENTS: Record<string, EventDef> = {
  outage: {
    name: 'Grid outage', site: true, fire: (w, s) => {
      const dur = Math.round(range(w, 2, 30))
      w.events.push({ id: newId(w, 'ev'), kind: 'outage', title: `Grid outage at ${s!.name}`, endTick: w.tick + dur, siteId: s!.id, mag: 1 })
      pushNews(w, 'bad', `Grid outage at ${s!.name}`, `Utility feed lost for ~${dur}h. On-site generation and batteries are all that stand between you and a very expensive silence.`, 'incident', 1)
    }
  },
  heatwave: {
    name: 'Heat wave', site: true, fire: (w, s) => {
      const mag = range(w, 7, 13)
      const days = Math.round(range(w, 3, 9))
      w.events.push({ id: newId(w, 'ev'), kind: 'heatwave', title: `Heat wave near ${s!.name}`, endTick: w.tick + days * 24, siteId: s!.id, mag })
      pushNews(w, 'bad', `Heat wave near ${s!.name}`, `+${mag.toFixed(0)}°C for ${days} days. Chillers derate. Frostine Chiller is sweating.`, 'incident', 1)
    }
  },
  priceSpike: {
    name: 'Power price spike', site: true, fire: (w, s) => {
      const mag = range(w, 2, s!.regionId === 'tx' ? 9 : 4)
      const days = Math.round(range(w, 1, 5))
      w.events.push({ id: newId(w, 'ev'), kind: 'priceSpike', title: `Power price spike at ${s!.name}`, endTick: w.tick + days * 24, siteId: s!.id, mag })
      pushNews(w, 'bad', `Power price spike in ${region(s!.regionId).name}`, `Spot prices ×${mag.toFixed(1)} for ${days} days. Batteries and on-site gas suddenly look smart.`, 'market', 1)
    }
  },
  disaster: {
    name: 'Wildfire / flood', site: true, fire: (w, s) => {
      const days = Math.round(range(w, 5, 20))
      w.events.push({ id: newId(w, 'ev'), kind: 'outage', title: `Wildfire / flood at ${s!.name}`, endTick: w.tick + days * 24, siteId: s!.id, mag: 1 })
      pushNews(w, 'bad', `Disaster near ${s!.name}`, `Utility offline for ~${days} days. Insurance adjusters are on their way.`, 'incident', 2)
    }
  },
  hype: {
    name: 'AI hype spike', site: false, fire: (w) => {
      w.market.boom *= range(w, 1.15, 1.5)
      pushNews(w, 'event', 'AI hype cycle spikes', `${pick(w, ['A viral demo', 'A benchmark', 'A podcast', 'A very confident tweet'])} sends GPU demand soaring. Rental rates climb.`, 'market', 1)
    }
  },
  winter: {
    name: 'AI winter whispers', site: false, fire: (w) => {
      w.market.boom *= range(w, 0.65, 0.88)
      pushNews(w, 'event', 'AI winter whispers', 'Analysts discover that "AI revenue" and "AI hype" are different columns. Demand softens.', 'market', 1)
    }
  },
  supplyCrunch: {
    name: 'GPU supply crunch', site: false, fire: (w) => {
      w.market.supplyTight = Math.min(2.5, w.market.supplyTight + range(w, 0.3, 0.8))
      pushNews(w, 'event', 'GPU supply crunch', pick(w, ['A fab in Taiwan-ish Co. hiccups.', 'HBM memory is sold out through next year.', 'New export controls snarl shipments.', 'CoWoS packaging capacity maxed out.']), 'market', 1)
    }
  },
  lawsuit: {
    name: 'Copyright lawsuit', site: false, fire: (w) => {
      const fine = Math.round(range(w, 0.3, 2.5) * 1e6 * (1 + legalRisk(w) * 3))
      w.cash -= fine
      pushNews(w, 'bad', 'Copyright lawsuit settled', `A coalition of authors, illustrators and one very litigious cat settle for $${(fine / 1e6).toFixed(1)}M.`, 'mine', 1)
    }
  }
}

/** Fire an event now (dev tools, scripted stories). Site events need a site id. */
export function triggerEvent(w: World, id: string, siteId?: string): R {
  const e = EVENTS[id]; if (!e) return { ok: false, error: `Unknown event “${id}”` }
  let s: Site | undefined
  if (e.site) { s = w.sites.find((x) => x.id === siteId); if (!s) return { ok: false, error: 'Pick a site for this event' } }
  e.fire(w, s)
  return { ok: true, value: undefined }
}

export function rollDailyEvents(w: World): void {
  const day = Math.floor(w.tick / 24)
  w.events = w.events.filter((e) => e.endTick > w.tick)
  const summer = 0.5 + 0.5 * Math.sin(2 * Math.PI * ((day % 365) / 365 - 0.2))
  for (const s of w.sites) {
    const r = region(s.regionId)
    const outageP = ((1 - r.reliability) * 8766) / 12 / 365
    if (rnd(w) < outageP) EVENTS.outage.fire(w, s)
    if (rnd(w) < 0.004 * summer) EVENTS.heatwave.fire(w, s)
    if (rnd(w) < (s.regionId === 'tx' ? 0.012 : 0.003)) EVENTS.priceSpike.fire(w, s)
    if (rnd(w) < 0.0003) EVENTS.disaster.fire(w, s)
  }
  if (rnd(w) < 0.006) EVENTS.hype.fire(w)
  else if (rnd(w) < 0.004) EVENTS.winter.fire(w)
  if (rnd(w) < 0.004) EVENTS.supplyCrunch.fire(w)
  const risk = legalRisk(w)
  if (risk > 0 && rnd(w) < risk * 0.0025 && w.models.some((x) => x.releasedByPlayer)) EVENTS.lawsuit.fire(w)
}
