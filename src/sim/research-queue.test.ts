import { describe, expect, it } from 'vitest'
import * as A from './actions'
import { createWorld, stepMany } from './world'
import { TECHS } from './data/tech'

const roots = TECHS.filter((t) => !t.requires?.length && !t.repeatable).slice(0, 3).map((t) => t.id)

describe('research queue', () => {
  it('queues instead of replacing, and keeps the running tech’s progress', () => {
    const w = createWorld(2)
    expect(A.startResearch(w, roots[0]).ok).toBe(true)
    stepMany(w, 24 * 3)
    const p = w.research.progressUsd
    expect(p).toBeGreaterThan(0)
    expect(A.startResearch(w, roots[1]).ok).toBe(true)
    expect(w.research.current).toBe(roots[0])
    expect(w.research.progressUsd).toBe(p)
    expect(w.research.queue).toEqual([roots[1]])
  })
  it('starts the next queued tech when one finishes', () => {
    const w = createWorld(2)
    w.cash = 1e10
    A.startResearch(w, roots[0]); A.startResearch(w, roots[1])
    stepMany(w, 24 * 400)
    expect(w.research.done).toEqual(expect.arrayContaining([roots[0], roots[1]]))
  })
  it('lets you queue a tech whose prerequisite is ahead of it in the queue', () => {
    const w = createWorld(2)
    const child = TECHS.find((t) => t.requires?.length === 1 && !TECHS.find((x) => x.id === t.requires![0])?.requires?.length)!
    A.startResearch(w, child.requires![0])
    expect(A.startResearch(w, child.id).ok).toBe(true)
    expect(A.startResearch(w, child.id).ok).toBe(false) // already queued
  })
  it('switching with researchNow pauses the old tech without losing its progress', () => {
    const w = createWorld(2)
    A.startResearch(w, roots[0]); stepMany(w, 24 * 3)
    const p = w.research.progressUsd
    A.startResearch(w, roots[1])
    expect(A.researchNow(w, roots[1]).ok).toBe(true)
    expect(w.research.current).toBe(roots[1])
    expect(w.research.queue![0]).toBe(roots[0])
    A.researchNow(w, roots[0])
    expect(w.research.progressUsd).toBe(p)
  })
  it('dequeue removes an item', () => {
    const w = createWorld(2)
    A.startResearch(w, roots[0]); A.startResearch(w, roots[1]); A.startResearch(w, roots[2])
    A.dequeueResearch(w, roots[1])
    expect(w.research.queue).toEqual([roots[2]])
  })
  it('keeps progressing with unlimited cash even when the balance is negative', () => {
    const w = createWorld(2, 'S', 'Y', 'cfo', undefined, { mode: 'sandbox', infiniteCash: true })
    w.cash = -5e9
    A.startResearch(w, roots[0]); stepMany(w, 24 * 2)
    expect(w.research.progressUsd).toBeGreaterThan(0)
  })
})
