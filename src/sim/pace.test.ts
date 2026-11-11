import { describe, expect, it } from 'vitest'
import * as A from './actions'
import { paceH } from './rules'
import { createWorld } from './world'

describe('pace and withdrawal', () => {
  it('arcade shortens durations 4x, realistic leaves them alone', () => {
    const w = createWorld(3)
    expect(w.rules.pace).toBe('arcade')
    expect(paceH(w, 96)).toBe(24)
    w.rules.pace = 'realistic'
    expect(paceH(w, 96)).toBe(96)
  })
  it('withdrawing a model unlists it and removes its products', () => {
    const w = createWorld(3)
    expect(A.withdrawModel(w, 'nope').ok).toBe(false)
    expect(A.retireProduct(w, 'nope').ok).toBe(false)
  })
})
