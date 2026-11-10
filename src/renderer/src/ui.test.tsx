// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { renderToString } from 'react-dom/server'
import { createElement as h } from 'react'
import { Advanced, PrimaryActions, Summary, Term } from './ui'
import { GLOSSARY } from './glossary'

describe('simple-first building blocks', () => {
  it('Advanced hides its contents by default and shows them when opened', () => {
    expect(renderToString(h(Advanced, { children: 'deep controls' }))).not.toContain('deep controls')
    expect(renderToString(h(Advanced, { defaultOpen: true, children: 'deep controls' }))).toContain('deep controls')
  })
  it('Summary shows each stat label and value', () => {
    const html = renderToString(h(Summary, { items: [{ label: 'Racks', value: '12' }, { label: 'Load', value: '3 MW', tone: 'warn' }] }))
    expect(html).toContain('Racks'); expect(html).toContain('3 MW'); expect(html).toContain('warn')
  })
  it('PrimaryActions renders its buttons', () => {
    expect(renderToString(h(PrimaryActions, { children: h('button', null, 'Go') }))).toContain('Go')
  })
  it('Term explains jargon in plain English', () => {
    const html = renderToString(h(Term, { k: 'pue', children: 'PUE' }))
    expect(html).toContain('PUE')
    expect(html).toContain(GLOSSARY.pue.replace(/&/g, '&amp;').slice(0, 20))
  })
  it('glossary covers the core jargon', () => {
    for (const k of ['mfu', 'pue', 'dr', 'ppa', 'cdu', 'crah', 'pdu', 'ups', 'hbm', 'nre', 'tapeout', 'litho', 'goodput', 'moe', 'gqa', 'mla', 'tokps', 'spot', 'reserved', 'churn', 'arpu', 'elo']) {
      expect(GLOSSARY[k], k).toBeTruthy()
    }
  })
})
