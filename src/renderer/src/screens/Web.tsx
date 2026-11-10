import { useState } from 'react'
import { ArrowLeft, ArrowRight, Globe, Lock, RotateCw, Search, Heart, MessageCircle, Repeat2 } from 'lucide-react'
import { SECTIONS, TEMPLATES_WEB, TLDS, buyDomain, domainPrice, publishSite, webQuality, weeklyDigest, type SiteTemplate } from '@sim/web'
import { corp } from '@sim/data/lore'
import { evaluateChip } from '@sim/silicon'
import { valuation } from '@sim/world'
import { totalGpus, yearOf } from '@sim/util'
import { dateOf, money, num } from '../format'
import { useGame, useWorld } from '../store'
import { Field } from '../ui'
import { Glyph, WordMark, type LogoGlyph } from '../art/Logos'
import { Portrait } from '../art/People'

type Url = 'home' | 'registrar' | 'builder' | 'vergence' | 'noose' | 'chirper' | 'digest'
const BOOKMARKS: { id: Url; label: string; host: string }[] = [
  { id: 'home', label: 'Your site', host: '' }, { id: 'builder', label: 'Site builder', host: 'squarespaceship.com/editor' },
  { id: 'registrar', label: 'Domains', host: 'goddady.biz' }, { id: 'vergence', label: 'The Vergence', host: 'thevergence.com' },
  { id: 'noose', label: 'HackerNoose', host: 'news.hackernoose.com' }, { id: 'chirper', label: 'Chirper', host: 'chirper.com/explore' },
  { id: 'digest', label: 'Weekly Tensor', host: 'weeklytensor.substack-ish.com' }
]

export function Web() {
  const w = useWorld()
  const [url, setUrl] = useState<Url>(w.web.site ? 'home' : 'registrar')
  const host = url === 'home' ? (w.web.primary ?? 'about:blank') : BOOKMARKS.find((b) => b.id === url)!.host
  return (
    <div style={{ borderRadius: 22, overflow: 'hidden', boxShadow: 'var(--sh-2)', background: 'var(--surface)' }}>
      <div style={{ background: 'var(--surface-3)', padding: '10px 14px 0' }}>
        <div className="row" style={{ gap: 4 }}>{BOOKMARKS.map((b) => <button key={b.id} onClick={() => setUrl(b.id)} style={{ border: 0, cursor: 'pointer', padding: '8px 14px', borderRadius: '12px 12px 0 0', background: url === b.id ? 'var(--surface)' : 'transparent', font: '550 12.5px var(--sans)', color: url === b.id ? 'var(--tx)' : 'var(--tx-3)' }}>{b.label}</button>)}</div>
      </div>
      <div className="row" style={{ padding: '10px 14px', gap: 10, borderBottom: '1px solid var(--line)' }}>
        <ArrowLeft size={16} className="dim" /><ArrowRight size={16} className="dim" /><RotateCw size={15} className="dim" />
        <div className="row" style={{ flex: 1, gap: 8, background: 'var(--surface-2)', borderRadius: 99, padding: '7px 14px', fontSize: 13 }}><Lock size={13} className="dim" /><span>https://{host}</span></div>
      </div>
      <div style={{ minHeight: 560, maxHeight: 'calc(100vh - 290px)', overflow: 'auto' }}>
        {url === 'home' && <YourSite onBuild={() => setUrl('builder')} />}
        {url === 'registrar' && <Registrar />}
        {url === 'builder' && <Builder onDone={() => setUrl('home')} />}
        {url === 'vergence' && <Vergence />}
        {url === 'noose' && <Noose />}
        {url === 'chirper' && <Chirper />}
        {url === 'digest' && <Digest />}
      </div>
    </div>
  )
}

function YourSite({ onBuild }: { onBuild: () => void }) {
  const w = useWorld()
  const s = w.web.site
  if (!s) return <div style={{ display: 'grid', placeItems: 'center', height: 520, textAlign: 'center' }}><div><Globe size={42} className="dim" /><h2 style={{ fontSize: 24, marginTop: 12 }}>This site can’t be reached</h2><p className="dim">{w.web.primary ? `${w.web.primary} has no website yet.` : 'You do not own a domain yet.'}</p><button className="btn pri" style={{ marginTop: 16 }} onClick={onBuild}>Open the site builder</button></div></div>
  const dark = s.template === 'bold', brut = s.template === 'brutalist'
  const bg = dark ? '#0f1220' : brut ? '#f1ede4' : '#ffffff', fg = dark ? '#ffffff' : '#1d2230'
  const models = w.models.filter((m) => m.releasedByPlayer)
  const chips = w.silicon.designs.filter((d) => d.status === 'ready')
  return (
    <div style={{ background: bg, color: fg, minHeight: 560, fontFamily: brut ? 'ui-monospace, monospace' : 'var(--sans)' }}>
      <div className="row" style={{ padding: '18px 40px', justifyContent: 'space-between', borderBottom: brut ? `3px solid ${fg}` : 'none' }}><WordMark glyph={w.logo.glyph as LogoGlyph} color={w.logo.color} name={w.company} size={18} /><div className="row" style={{ gap: 22, fontSize: 13.5, opacity: 0.8 }}>{s.sections.slice(0, 5).map((x) => <span key={x}>{x}</span>)}</div></div>
      <div style={{ padding: brut ? '70px 40px' : '90px 40px', textAlign: s.template === 'corporate' ? 'left' : 'center' }}>
        <h1 style={{ fontSize: brut ? 76 : 64, lineHeight: 0.95, letterSpacing: brut ? '-.02em' : '-.045em', background: dark ? `linear-gradient(90deg, #fff, ${w.logo.color})` : undefined, WebkitBackgroundClip: dark ? 'text' : undefined, color: dark ? 'transparent' : fg, textTransform: brut ? 'uppercase' : 'none' }}>{s.headline}</h1>
        <p style={{ fontSize: 19, opacity: 0.7, maxWidth: 640, margin: s.template === 'corporate' ? '18px 0 0' : '18px auto 0' }}>{s.tagline}</p>
        <div style={{ marginTop: 28 }}><span style={{ display: 'inline-block', padding: '12px 22px', borderRadius: brut ? 0 : 99, background: dark ? 'white' : fg, color: dark ? '#0f1220' : bg, fontWeight: 650 }}>Get API access →</span></div>
      </div>
      {s.sections.includes('Products') && <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16, padding: '0 40px 40px' }}>
        {models.map((m) => <div key={m.id} style={{ padding: 20, borderRadius: brut ? 0 : 16, border: `1px solid ${dark ? '#ffffff22' : '#00000014'}` }}><b>{m.name}</b><div style={{ opacity: 0.6, fontSize: 13 }}>Elo {Math.round(m.elo)} · ${m.priceMtok.toFixed(2)}/Mtok</div></div>)}
        {chips.map((d) => <div key={d.id} style={{ padding: 20, borderRadius: brut ? 0 : 16, border: `1px solid ${dark ? '#ffffff22' : '#00000014'}` }}><b>{d.spec.name}</b><div style={{ opacity: 0.6, fontSize: 13 }}>{num(evaluateChip(d.spec, yearOf(w.tick)).tflops)} TFLOPS · {money(d.salePrice)}</div></div>)}
        {models.length + chips.length === 0 && <div style={{ opacity: 0.6 }}>Products coming soon™</div>}
      </div>}
      {s.sections.includes('Investor relations') && <div className="row" style={{ padding: '24px 40px', gap: 40, borderTop: `1px solid ${dark ? '#ffffff22' : '#00000014'}` }}><span>Valuation <b>{money(valuation(w))}</b></span><span>GPUs <b>{num(totalGpus(w))}</b></span><span>Sites <b>{w.sites.length}</b></span></div>}
      <div style={{ padding: '18px 40px', fontSize: 12, opacity: 0.5 }}>© {Math.floor(yearOf(w.tick))} {w.company}. Web quality score {(webQuality(w) * 100).toFixed(0)}/100.</div>
    </div>
  )
}

function Registrar() {
  const w = useWorld(); const act = useGame((s) => s.act)
  const base = w.company.toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 18) || 'mycompany'
  const [q, setQ] = useState(base)
  const label = q.toLowerCase().replace(/[^a-z0-9-]/g, '').split('.')[0]
  return (
    <div style={{ padding: '36px 40px' }}>
      <div style={{ fontSize: 30, fontWeight: 750, letterSpacing: '-.03em', color: 'oklch(0.45 0.15 150)' }}>GoDaddy-ish™</div>
      <p className="dim">Find your perfect domain. Upsells included at no extra charge.</p>
      <div className="row" style={{ marginTop: 18, maxWidth: 560 }}><div style={{ position: 'relative', flex: 1 }}><Search size={15} style={{ position: 'absolute', left: 12, top: 11 }} className="dim" /><input type="text" value={q} onChange={(e) => setQ(e.target.value)} style={{ paddingLeft: 34 }} /></div></div>
      <div className="col" style={{ marginTop: 20, gap: 8, maxWidth: 720 }}>
        {TLDS.map((t) => { const name = `${label}.${t}`; const p = domainPrice(name); const owned = w.web.domains.includes(name); return (
          <div key={t} className="saverow"><span className="grow"><b>{label}</b><span className="dim">.{t}</span>{p > 1e6 && <span className="tag a" style={{ marginLeft: 8 }}>premium</span>}</span><b>{Number.isFinite(p) ? money(p) : '—'}</b>
            <button className={'btn sm ' + (owned ? 'ghost' : 'pri')} disabled={owned || !Number.isFinite(p)} onClick={() => act((x) => buyDomain(x, name), 'Domain registered')}>{owned ? 'Owned' : 'Buy'}</button></div>) })}
      </div>
      {w.web.domains.length > 0 && <p className="dim" style={{ marginTop: 18 }}>Your domains: {w.web.domains.join(', ')}</p>}
    </div>
  )
}

function Builder({ onDone }: { onDone: () => void }) {
  const w = useWorld(); const act = useGame((s) => s.act)
  const [template, setT] = useState<SiteTemplate>(w.web.site?.template ?? 'bold')
  const [headline, setH] = useState(w.web.site?.headline ?? 'Intelligence, at planetary scale.')
  const [tagline, setTag] = useState(w.web.site?.tagline ?? `${w.company} builds the compute, the chips and the models.`)
  const [sections, setS] = useState<string[]>(w.web.site?.sections ?? ['Products', 'Pricing', 'Benchmarks'])
  return (
    <div style={{ padding: '30px 40px', display: 'grid', gap: 18, maxWidth: 900 }}>
      <h2 style={{ fontSize: 24 }}>Squarespaceship editor</h2>
      {!w.web.primary && <div className="tag a">You need a domain before you can publish.</div>}
      <div className="grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>{(Object.keys(TEMPLATES_WEB) as SiteTemplate[]).map((k) => <button key={k} className={'adv' + (template === k ? ' on' : '')} style={{ gridTemplateColumns: '1fr' }} onClick={() => setT(k)}><b>{TEMPLATES_WEB[k].name}</b><span>{TEMPLATES_WEB[k].blurb}</span><em>{money(TEMPLATES_WEB[k].cost)}</em></button>)}</div>
      <Field label="Headline"><input type="text" value={headline} onChange={(e) => setH(e.target.value)} /></Field>
      <Field label="Tagline"><input type="text" value={tagline} onChange={(e) => setTag(e.target.value)} /></Field>
      <div className="row wrap" style={{ gap: 8 }}>{SECTIONS.map((x) => <button key={x} className={'btn sm ' + (sections.includes(x) ? 'pri' : '')} onClick={() => setS(sections.includes(x) ? sections.filter((y) => y !== x) : [...sections, x])}>{x}</button>)}</div>
      <div><button className="btn pri" onClick={() => { const r = act((x) => publishSite(x, { template, headline, tagline, sections }), 'Site published'); if (r.ok) onDone() }}>Publish · {money(TEMPLATES_WEB[template].cost)}</button></div>
    </div>
  )
}

function Vergence() {
  const w = useWorld()
  const items = w.news.filter((n) => n.kind !== 'info').slice(0, 12)
  return (
    <div style={{ padding: '26px 40px', fontFamily: 'var(--display)' }}>
      <div style={{ fontSize: 44, fontWeight: 800, letterSpacing: '-.05em', color: 'oklch(0.55 0.25 330)' }}>THE VERGENCE</div>
      <div className="grid" style={{ gridTemplateColumns: '2fr 1fr 1fr', gap: 20, marginTop: 20 }}>
        {items.map((n, i) => <article key={i} style={{ gridColumn: i === 0 ? 'span 2' : undefined, gridRow: i === 0 ? 'span 2' : undefined, borderTop: '3px solid oklch(0.55 0.25 330)', paddingTop: 10 }}>
          <div style={{ fontSize: 11, fontFamily: 'var(--sans)', fontWeight: 700, color: 'oklch(0.55 0.25 330)' }}>{n.kind === 'bad' ? 'POLICY' : n.kind === 'good' ? 'AI' : 'MARKETS'} · {dateOf(n.tick)}</div>
          <h3 style={{ fontSize: i === 0 ? 34 : 19, lineHeight: 1.08, letterSpacing: '-.03em', margin: '6px 0' }}>{n.title}</h3>
          <p style={{ fontFamily: 'var(--sans)', fontSize: 13.5, color: 'var(--tx-3)' }}>{n.body}</p>
        </article>)}
      </div>
    </div>
  )
}

const SNARK = ['This is just a wrapper around a wrapper.', 'Can it run Doom though?', 'I give it 18 months before the pivot to crypto.', 'Benchmarks are meaningless. Anyway, here is my benchmark.', 'The real innovation is the cooling loop. Change my mind.', 'Have they considered just using SQLite?', 'Ok but what is the TCO per token?', 'Reminder that PUE is a vanity metric.']
function Noose() {
  const w = useWorld()
  const posts = w.news.slice(0, 20).map((n, i) => ({ title: n.title, points: 40 + ((n.tick * 7 + i * 13) % 900), comments: 5 + ((n.tick + i * 31) % 400), by: ['throwaway42', 'gpu_bro', 'rustacean', 'yc_founder', 'kernelhacker'][i % 5], snark: SNARK[(n.tick + i) % SNARK.length] }))
  return (
    <div style={{ background: '#f6f6ef', minHeight: 560, fontFamily: 'Verdana, sans-serif', fontSize: 13 }}>
      <div style={{ background: '#ff6600', padding: '4px 10px', fontWeight: 700 }}>Hacker Noose <span style={{ fontWeight: 400 }}>new | past | comments | ask | show | jobs</span></div>
      <ol style={{ padding: '10px 40px' }}>{posts.map((p, i) => <li key={i} style={{ margin: '6px 0' }}><span>{p.title}</span><div style={{ fontSize: 11, color: '#828282' }}>{p.points} points by {p.by} | {p.comments} comments — <i>top comment: “{p.snark}”</i></div></li>)}</ol>
    </div>
  )
}

function Chirper() {
  const w = useWorld()
  const posts = w.news.filter((n) => n.title === 'Chirper is talking' || n.kind === 'event').slice(0, 15)
  return (
    <div style={{ maxWidth: 620, margin: '0 auto', padding: '20px 0' }}>
      {posts.length === 0 && <p className="dim" style={{ padding: 30 }}>The timeline is quiet. Suspiciously quiet.</p>}
      {posts.map((p, i) => { const who = p.title === 'Chirper is talking' ? ['@siliconsnark', '@leatherjacketfan', '@vc_thoughtlord', '@benchmarkbro'][i % 4] : '@' + (corp(['openaye', 'qooqle', 'ratthropic', 'nvidious'][i % 4]).name.toLowerCase().replace(/[^a-z]/g, '')); return (
        <div key={i} className="row" style={{ alignItems: 'flex-start', gap: 12, padding: '14px 18px', borderBottom: '1px solid var(--line)' }}>
          <span style={{ borderRadius: 99, overflow: 'hidden', flex: 'none' }}><Portrait seed={who} size={42} /></span>
          <div style={{ flex: 1 }}><b>{who.slice(1)}</b> <span className="dim">{who} · {dateOf(p.tick)}</span><p style={{ margin: '4px 0 8px' }}>{p.title === 'Chirper is talking' ? p.body : `${p.title}. ${p.body}`}</p>
            <div className="row dim" style={{ gap: 30, fontSize: 12.5 }}><span><MessageCircle size={13} /> {(p.tick * 3) % 900}</span><span><Repeat2 size={13} /> {(p.tick * 7) % 4000}</span><span><Heart size={13} /> {num((p.tick * 13) % 90000)}</span></div></div>
        </div>) })}
    </div>
  )
}

function Digest() {
  const w = useWorld()
  const d = weeklyDigest(w)
  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: '40px 20px', fontFamily: 'Georgia, serif' }}>
      <div className="row" style={{ gap: 10 }}><Glyph glyph="spark" color="oklch(0.66 0.17 45)" size={26} /><b style={{ fontFamily: 'var(--sans)' }}>The Weekly Tensor</b></div>
      <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 34, letterSpacing: '-.01em', margin: '18px 0 6px' }}>{d.title}</h1>
      <p className="dim" style={{ fontFamily: 'var(--sans)', fontSize: 13 }}>{dateOf(w.tick)} · 4 min read</p>
      {d.lines.map((l, i) => <p key={i} style={{ fontSize: 17, lineHeight: 1.6, margin: '14px 0' }}>{i === 0 ? <b>{l}</b> : l}</p>)}
    </div>
  )
}
