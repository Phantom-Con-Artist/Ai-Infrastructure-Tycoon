// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { renderToString } from 'react-dom/server'
import { createElement } from 'react'
import * as A from '@sim/actions'
import { createWorld, stepMany } from '@sim/world'
import { useGame } from '../store'
import { Overview } from './Overview'
import { Fleet } from './Fleet'
import { Lab } from './Lab'
import { Contracts, Finance, Research } from './Business'
import { Sites } from './Sites'

describe('screens render against a running world', () => {
  it('renders all', () => {
    const w = createWorld(9, 'Test Co', 'cto'); w.cash = 3e8
    const s = (A.buildSite(w, 'or') as any).value
    const h = (A.buildHall(w, s.id, { slots: 24, cooling: 'air', powerKw: 1000, coolKw: 1100, fabric: 'eth100' }) as any).value
    A.orderServers(w, s.id, 'nv-h1000', 40)
    while (w.tick < h.readyTick + 24 || (s.stock['nv-h1000'] ?? 0) < 40) stepMany(w, 1)
    A.installServers(w, s.id, h.id, 'nv-h1000', 40)
    A.startTraining(w, { name: 'X', paramsB: 7, tokensT: 0.1, siteId: s.id, gpuId: 'nv-h1000', servers: 20 })
    A.setRental(w, s.id, 'nv-h1000', 20)
    A.buildGenerator(w, s.id, 'battery', 5)
    stepMany(w, 24 * 60)
    A.launchModel(w, w.models[0].id)
    stepMany(w, 24 * 30)
    useGame.setState({ w, siteId: s.id, rev: 1 })
    for (const C of [Overview, Fleet, Lab, Contracts, Research, Finance, Sites]) expect(renderToString(createElement(C)).length).toBeGreaterThan(200)
  })
})
