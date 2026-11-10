import { describe, expect, it } from 'vitest'
import { createWorld, stepMany } from './world'
import { buildEdition } from './newspaper'
import { pushNews } from './util'

describe('The Daily Compute', () => {
  it('prints a slow-news edition when nothing happened', () => {
    const w = createWorld(1)
    w.news = []; w.tick = 48
    const e = buildEdition(w)
    expect(e.slowNews).toBe(true)
    expect(e.lead.title.length).toBeGreaterThan(0)
    expect(w.editions[0]).toBe(e)
    expect(e.day).toBe(2)
  })
  it('leads with the most important story of the day', () => {
    const w = createWorld(1)
    w.news = []; w.tick = 100
    pushNews(w, 'info', 'small', 'a', 'mine', 0)
    pushNews(w, 'bad', 'big', 'b', 'incident', 2)
    pushNews(w, 'event', 'mid', 'c', 'market', 1)
    w.tick = 120
    const e = buildEdition(w)
    expect(e.slowNews).toBe(false)
    expect(e.lead.title).toBe('big')
    expect(e.stories.map((s) => s.title)).toEqual(['mid', 'small'])
  })
  it('ignores news older than a day and caps stories at 6', () => {
    const w = createWorld(1)
    w.news = []; w.tick = 10
    pushNews(w, 'info', 'old', 'x')
    w.tick = 100
    for (let i = 0; i < 9; i++) pushNews(w, 'info', 'n' + i, 'x')
    w.tick = 110
    const e = buildEdition(w)
    expect(e.stories.length).toBe(6)
    expect([e.lead, ...e.stories].some((s) => s.title === 'old')).toBe(false)
  })
  it('prints daily, keeps 30, and is deterministic', () => {
    const a = createWorld(9), b = createWorld(9)
    stepMany(a, 24 * 40); stepMany(b, 24 * 40)
    expect(a.editions.length).toBe(30)
    expect(a.editions[0].day).toBe(40)
    expect(JSON.stringify(a.editions)).toBe(JSON.stringify(b.editions))
    expect(a.editions[0].market.rivals.length).toBeGreaterThan(0)
    expect(a.editions[0].market.gpuSpot).toBeGreaterThan(0)
  })
})
