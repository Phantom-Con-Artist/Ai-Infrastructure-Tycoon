import { region } from './data/hardware'
import { pick, rnd, range } from './rng'
import type { World } from './types'
import { newId, pushNews } from './util'

export function rollDailyEvents(w: World): void {
  const day = Math.floor(w.tick / 24)
  w.events = w.events.filter((e) => e.endTick > w.tick)
  const summer = 0.5 + 0.5 * Math.sin(2 * Math.PI * ((day % 365) / 365 - 0.2))
  for (const s of w.sites) {
    const r = region(s.regionId)
    const outageP = ((1 - r.reliability) * 8766) / 12 / 365
    if (rnd(w) < outageP) {
      const dur = Math.round(range(w, 2, 30))
      w.events.push({ id: newId(w, 'ev'), kind: 'outage', title: `Grid outage at ${s.name}`, endTick: w.tick + dur, siteId: s.id, mag: 1 })
      pushNews(w, 'bad', `Grid outage at ${s.name}`, `Utility feed lost for ~${dur}h. On-site generation and batteries are all that stand between you and a very expensive silence.`)
    }
    if (rnd(w) < 0.004 * summer) {
      const mag = range(w, 7, 13)
      const days = Math.round(range(w, 3, 9))
      w.events.push({ id: newId(w, 'ev'), kind: 'heatwave', title: `Heat wave near ${s.name}`, endTick: w.tick + days * 24, siteId: s.id, mag })
      pushNews(w, 'bad', `Heat wave near ${s.name}`, `+${mag.toFixed(0)}°C for ${days} days. Chillers derate. Frostine Chiller is sweating.`)
    }
    if (rnd(w) < (s.regionId === 'tx' ? 0.012 : 0.003)) {
      const mag = range(w, 2, s.regionId === 'tx' ? 9 : 4)
      const days = Math.round(range(w, 1, 5))
      w.events.push({ id: newId(w, 'ev'), kind: 'priceSpike', title: `Power price spike at ${s.name}`, endTick: w.tick + days * 24, siteId: s.id, mag })
      pushNews(w, 'bad', `Power price spike in ${region(s.regionId).name}`, `Spot prices ×${mag.toFixed(1)} for ${days} days. Batteries and on-site gas suddenly look smart.`)
    }
    if (rnd(w) < 0.0003) {
      const days = Math.round(range(w, 5, 20))
      w.events.push({ id: newId(w, 'ev'), kind: 'outage', title: `Wildfire / flood at ${s.name}`, endTick: w.tick + days * 24, siteId: s.id, mag: 1 })
      pushNews(w, 'bad', `Disaster near ${s.name}`, `Utility offline for ~${days} days. Insurance adjusters are on their way.`)
    }
  }
  const m = w.market
  if (rnd(w) < 0.006) {
    m.boom *= range(w, 1.15, 1.5)
    pushNews(w, 'event', 'AI hype cycle spikes', `${pick(w, ['A viral demo', 'A benchmark', 'A podcast', 'A very confident tweet'])} sends GPU demand soaring. Rental rates climb.`)
  } else if (rnd(w) < 0.004) {
    m.boom *= range(w, 0.65, 0.88)
    pushNews(w, 'event', 'AI winter whispers', 'Analysts discover that "AI revenue" and "AI hype" are different columns. Demand softens.')
  }
  if (rnd(w) < 0.004) {
    m.supplyTight = Math.min(2.5, m.supplyTight + range(w, 0.3, 0.8))
    pushNews(w, 'event', 'GPU supply crunch', pick(w, ['A fab in Taiwan-ish Co. hiccups.', 'HBM memory is sold out through next year.', 'New export controls snarl shipments.', 'CoWoS packaging capacity maxed out.']))
  }
  if (rnd(w) < 0.003 && w.models.some((x) => x.releasedByPlayer)) {
    const fine = Math.round(range(w, 0.3, 2.5) * 1e6)
    w.cash -= fine
    pushNews(w, 'bad', 'Copyright lawsuit settled', `A coalition of authors, illustrators and one very litigious cat settle for $${(fine / 1e6).toFixed(1)}M.`)
  }
}
