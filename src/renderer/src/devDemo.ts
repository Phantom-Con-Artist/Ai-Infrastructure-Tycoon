/** Dev-only: build a running demo company in one call (`await __demo()`), for live UI testing after hot reloads. */
import * as A from '@sim/actions'
import { availableGpus, step, stepMany } from '@sim/world'
import type { Rules } from '@sim/rules'
import { useGame } from './store'

export function demo(o: { days?: number; rules?: Partial<Rules>; servers?: number } = {}): void {
  const g = useGame.getState()
  g.newGame({ company: 'Northwind Compute', ceo: 'Avery', advisor: 'cfo', seed: 7, logo: { glyph: 'hex', color: 'oklch(0.6 0.17 155)' }, rules: o.rules })
  const w = useGame.getState().w!
  w.cash = Math.max(w.cash, 3e8)
  const site = (A.buildSite(w, 'or') as { ok: true; value: import('@sim/types').Site }).value
  const hall = (A.buildHall(w, site.id, { size: 'M', cooling: 'air', fabric: 'eth100' }) as { ok: true; value: import('@sim/types').Hall }).value
  A.autoLayout(w, hall.id)
  const n = o.servers ?? 60
  if (n > 0) {
    const gpu = availableGpus(w).filter((x) => !x.vcpus).sort((a, b) => b.tflops - a.tflops)[0]
    A.orderServers(w, site.id, gpu.id, n)
    while (w.tick < hall.readyTick + 24 || (site.stock[gpu.id] ?? 0) < n) step(w)
    A.installServers(w, site.id, hall.id, gpu.id, n - 4)
    A.setRental(w, site.id, gpu.id, Math.floor(n * 0.6), 1, 'ondemand')
  }
  stepMany(w, 24 * (o.days ?? 20))
  useGame.setState((s) => ({ rev: s.rev + 1, lastReadTick: w.tick - 24 * 3 }))
}
