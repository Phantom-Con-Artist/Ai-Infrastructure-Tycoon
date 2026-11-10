import { useMemo, useState } from 'react'
import { Cpu, Factory, Microchip, Sparkles } from 'lucide-react'
import * as C from '@sim/chips'
import { HBM, LITHO, PACKAGES, node, type LithoKind, type PackageKind } from '@sim/data/silicon'
import { gpuCatalog } from '@sim/data/hardware'
import { evaluateChip, type ChipSpec } from '@sim/silicon'
import { hasTech, yearOf } from '@sim/util'
import { dateOf, money, num, sci } from '../format'
import { useGame, useWorld } from '../store'
import { EmptyState, Field, Num, Tabs } from '../ui'
import { Floorplan, WaferMap } from '../art/ChipArt'
import { GpuArt } from '../art/GpuArt'
import * as PV from '@sim/preview'

const NAMES = ['Dreamchip', 'Hyperion', 'Thunderdie', 'Overclockasaurus', 'Gigabrain', 'Siliconthesizer', 'MegaMatmul', 'Tensorus Rex', 'Chonk']

export function Silicon() {
  const w = useWorld(); const go = useGame((s) => s.go)
  const [tab, setTab] = useState<'designer' | 'products' | 'fab'>(w.silicon.designs.length ? 'products' : 'designer')
  if (!hasTech(w, 'fabless')) return (
    <EmptyState art={<div style={{ display: 'grid', placeItems: 'center', gap: 12 }}><WaferMap dieMm2={600} yieldFrac={0.7} size={240} seed={3} /></div>}
      eyebrow="Silicon · locked" title="Why buy GPUs when you could make them?"
      body="Hire a chip design team in R&D to draw your own accelerators: pick a process node, a die size, how much area goes to tensor cores versus SRAM, how many HBM stacks to bolt on. Physics pushes back through yield, power and reticle limits. Later: CPUs, in-house DRAM, chiplets, wafer-scale engines and your own EUV fab.">
      <button className="btn pri" onClick={() => go('research')}><Sparkles size={14} /> Open R&D</button>
    </EmptyState>
  )
  return (
    <>
      <div className="page-head"><div><div className="eyebrow">Silicon division</div><h1>Make your dream chip</h1></div>
        <Tabs tabs={['designer', 'products', 'fab'] as const} value={tab} onChange={setTab} /></div>
      {tab === 'designer' && <Designer onDone={() => setTab('products')} />}
      {tab === 'products' && <Products onNew={() => setTab('designer')} />}
      {tab === 'fab' && <FabView />}
    </>
  )
}

function Designer({ onDone }: { onDone: () => void }) {
  const w = useWorld(); const act = useGame((s) => s.act)
  const o = C.siliconOptions(w)
  const [s, set] = useState<ChipSpec>(() => ({
    kind: 'gpu', name: `${NAMES[w.silicon.designs.length % NAMES.length]} ${w.silicon.designs.length + 1}`, nodeId: o.nodes[o.nodes.length - 1] ?? 'n7',
    dieMm2: 600, dies: 1, pkg: o.packages.includes('cowos-s') ? 'cowos-s' : 'mono', computeFrac: 0.5, sramFrac: 0.2, clockGHz: 1.6, archGen: o.maxArch,
    precision: o.precisions[o.precisions.length - 1], redundancy: true, hbmId: o.hbm[o.hbm.length - 1] ?? 'hbm2e', hbmStacks: o.packages.includes('cowos-s') ? 4 : 2, hbmHeight: 8, cpuCores: 64
  }))
  const up = (p: Partial<ChipSpec>): void => set((x) => ({ ...x, ...p }))
  const year = yearOf(w.tick)
  const e = useMemo(() => evaluateChip(s, year), [s, year])
  const err = C.validateDesign(w, s)
  const n = node(s.nodeId)
  const best = gpuCatalog(year).sort((a, b) => b.tflops - a.tflops)[0]
  const wafer = s.pkg === 'wafer'
  const stat = (k: string, v: string, hint?: string, bad?: boolean) => <div className="panel" style={{ padding: '12px 14px' }}><div className="dim" style={{ fontSize: 12 }}>{k}</div><div style={{ fontSize: 19, fontWeight: 650, letterSpacing: '-.02em', color: bad ? 'var(--red)' : undefined }}>{v}</div>{hint && <div className="dim" style={{ fontSize: 11.5 }}>{hint}</div>}</div>
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 360px) 1fr', gap: 18 }}>
      <div className="panel col" style={{ gap: 14, alignContent: 'start' }}>
        <div className="tabs" style={{ marginBottom: 0 }}>{(['gpu', 'cpu'] as const).map((k) => <button key={k} disabled={k === 'cpu' && !o.cpu} className={s.kind === k ? 'on' : ''} onClick={() => up({ kind: k })}>{k === 'gpu' ? <><Microchip size={13} /> Accelerator</> : <><Cpu size={13} /> CPU{!o.cpu ? ' 🔒' : ''}</>}</button>)}</div>
        <Field label="Name"><input type="text" value={s.name} onChange={(ev) => up({ name: ev.target.value })} /></Field>
        <Field label="Process node"><div className="row wrap" style={{ gap: 6 }}>{o.nodes.map((id) => <button key={id} className={'btn sm ' + (s.nodeId === id ? 'pri' : '')} onClick={() => up({ nodeId: id, dieMm2: Math.min(s.dieMm2, node(id).reticleMm2) })}>{node(id).name.split(' ')[0]}</button>)}</div></Field>
        <Field label="Packaging"><select value={s.pkg} onChange={(ev) => up({ pkg: ev.target.value as PackageKind, dies: Math.min(s.dies, PACKAGES[ev.target.value as PackageKind].maxDies) })}>{(Object.keys(PACKAGES) as PackageKind[]).map((k) => <option key={k} value={k} disabled={!o.packages.includes(k)}>{PACKAGES[k].name}{o.packages.includes(k) ? '' : ' (locked)'}</option>)}</select></Field>
        {!wafer && <Field label={`Die area ${s.dieMm2} mm² · reticle ${n.reticleMm2}`}><input type="range" min={50} max={n.reticleMm2} step={2} value={s.dieMm2} onChange={(ev) => up({ dieMm2: +ev.target.value })} /></Field>}
        {!wafer && PACKAGES[s.pkg].maxDies > 1 && <Field label={`Compute dies ${s.dies}`}><input type="range" min={1} max={PACKAGES[s.pkg].maxDies} value={s.dies} onChange={(ev) => up({ dies: +ev.target.value })} /></Field>}
        <Field label={`${s.kind === 'gpu' ? 'Tensor cores' : 'Cores'} ${(s.computeFrac * 100).toFixed(0)}% · SRAM ${(s.sramFrac * 100).toFixed(0)}%`}>
          <input type="range" min={0.2} max={0.75} step={0.01} value={s.computeFrac} onChange={(ev) => up({ computeFrac: +ev.target.value })} />
          <input type="range" min={0.05} max={0.6} step={0.01} value={s.sramFrac} onChange={(ev) => up({ sramFrac: +ev.target.value })} />
        </Field>
        <Field label={`Clock ${s.clockGHz.toFixed(2)} GHz · nominal ${n.fNomGHz}`}><input type="range" min={0.6} max={n.fNomGHz * 1.4} step={0.01} value={s.clockGHz} onChange={(ev) => up({ clockGHz: +ev.target.value })} /></Field>
        {s.kind === 'cpu' && <Field label={`Cores ${s.cpuCores}`}><input type="range" min={8} max={512} step={8} value={s.cpuCores} onChange={(ev) => up({ cpuCores: +ev.target.value })} /></Field>}
        {s.kind === 'gpu' && !wafer && <>
          <Field label="Memory"><div className="row wrap" style={{ gap: 6 }}>{HBM.map((h) => <button key={h.id} disabled={!o.hbm.includes(h.id)} className={'btn sm ' + (s.hbmId === h.id ? 'pri' : '')} onClick={() => up({ hbmId: h.id, hbmHeight: Math.min(s.hbmHeight, h.maxStack) })}>{h.name}</button>)}</div></Field>
          <div className="row"><Field label={`Stacks ${s.hbmStacks}`}><input type="range" min={1} max={16} value={s.hbmStacks} onChange={(ev) => up({ hbmStacks: +ev.target.value })} /></Field>
            <Field label={`Height ${s.hbmHeight}-hi`}><input type="range" min={4} max={24} step={4} value={s.hbmHeight} onChange={(ev) => up({ hbmHeight: +ev.target.value })} /></Field></div>
        </>}
        <div className="row"><Field label="Tensor generation"><Num value={s.archGen} min={1} max={o.maxArch} onChange={(v) => up({ archGen: Math.max(1, Math.min(o.maxArch, v)) })} /></Field>
          <Field label="Precision"><select value={s.precision} onChange={(ev) => up({ precision: ev.target.value as ChipSpec['precision'] })}>{(['bf16', 'fp8', 'fp4'] as const).map((p) => <option key={p} value={p} disabled={!o.precisions.includes(p)}>{p.toUpperCase()}</option>)}</select></Field></div>
        <label className="row" style={{ fontSize: 13 }}><input type="checkbox" checked={s.redundancy} onChange={(ev) => up({ redundancy: ev.target.checked })} /> Redundant units (harvest defective dies)</label>
      </div>

      <div className="col" style={{ gap: 14, alignContent: 'start' }}>
        <div className="panel row" style={{ gap: 26, alignItems: 'center' }}>
          <Floorplan s={s} e={e} size={300} />
          <div className="col" style={{ gap: 10, justifyItems: 'center' }}>
            <WaferMap dieMm2={wafer ? 40000 : s.dieMm2} yieldFrac={e.dieYield} size={200} seed={Math.round(s.dieMm2)} />
            <div className="dim" style={{ fontSize: 12.5, textAlign: 'center' }}>{e.dpw} dies per wafer · {(e.dieYield * 100).toFixed(0)}% yield<br />{num(e.goodDiesPerWafer, 1)} good dies / wafer</div>
          </div>
          <div className="col" style={{ gap: 6 }}>
            <div className="eyebrow">{n.name} · {n.densityMTr} MTr/mm²</div>
            <div style={{ fontSize: 40, fontWeight: 700, letterSpacing: '-.04em', lineHeight: 1 }}>{num(e.transistorsB, 1)}B</div>
            <div className="dim">transistors · ≈{sci(e.atoms)} atoms</div>
            {s.kind === 'gpu' && <GpuArt g={{ id: 'x', vendor: 'player', name: s.name, year: 0, tflops: e.tflops, memGB: e.memGB, memTBs: e.memTBs, tdpW: e.tdpW, priceUsd: e.unitCost, mtbfH: 1 }} width={150} />}
          </div>
        </div>
        <div className="grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
          {s.kind === 'gpu' ? <>
            {stat('BF16 dense', `${num(e.tflops)} TFLOPS`, `${s.precision.toUpperCase()}: ${num(e.tflopsFp8)} · best on market ${num(best.tflops)}`)}
            {stat('Memory', `${num(e.memGB)} GB`, `${e.memTBs.toFixed(2)} TB/s · ${num(e.sramMB)} MB SRAM`)}
          </> : <>{stat('Throughput score', num(e.cpuScore), `${s.cpuCores} cores`)}{stat('SRAM cache', `${num(e.sramMB)} MB`)}</>}
          {stat('Power', `${num(e.tdpW)} W`, `${e.wPerMm2.toFixed(2)} W/mm² · needs ${e.coolingNeeded}`, e.coolingNeeded === 'immersion')}
          {stat('Efficiency', s.kind === 'gpu' ? `${e.perfPerWatt.toFixed(2)} TF/W` : `${e.perfPerWatt.toFixed(1)} /W`, `${e.perfPerDollar.toFixed(3)} per $`)}
          {stat('Unit cost', money(e.unitCost), `die ${money(e.dieCost)} · HBM ${money(e.hbmCost)} · pkg ${money(e.pkgCost)}`)}
          {stat('NRE', money(e.nreUsd), `masks + design · 30% upfront`)}
          {stat('Time to silicon', `${e.designMonths} months`, 'faster with more engineers')}
          {stat('Wafer price', money(n.waferUsd), `${n.litho.toUpperCase()} critical layers`)}
        </div>
        <div className="row">
          <button className="btn pri" disabled={!!err} onClick={() => { void useGame.getState().confirmAct(`Tape out ${s.name}?`, PV.previewTapeout(w, s), 'Tape out', (x) => C.startDesign(x, s), { okMsg: 'Tape-out started' }).then((r) => { if (r?.ok) onDone() }) }}>Start tape-out · {money(e.nreUsd * 0.3)} now</button>
          {err && <span className="neg" style={{ fontSize: 13 }}>{err}</span>}
        </div>
      </div>
    </div>
  )
}

function Products({ onNew }: { onNew: () => void }) {
  const w = useWorld(); const act = useGame((s) => s.act)
  const [siteId, setSite] = useState(w.sites[0]?.id ?? '')
  if (!w.silicon.designs.length) return <EmptyState art={<WaferMap dieMm2={300} yieldFrac={0.9} size={220} />} eyebrow="No chips yet" title="Your first tape-out awaits." body="Start in the designer. A small 7 nm die is cheap to tape out and teaches you the yield curve."><button className="btn pri" onClick={onNew}>Open designer</button></EmptyState>
  return (
    <div className="col" style={{ gap: 14 }}>
      {w.silicon.designs.map((d) => {
        const e = evaluateChip(d.spec, yearOf(w.tick))
        const stock = Math.floor(w.silicon.chipStock[d.id] ?? 0)
        const ec = d.status === 'ready' ? C.waferEconomics(w, d) : null
        const prog = d.status === 'designing' ? (w.tick - d.startTick) / (d.readyTick - d.startTick) : 1
        return (
          <div key={d.id} className="panel col" style={{ gap: 12 }}>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <div className="row" style={{ gap: 14 }}>{d.spec.kind === 'gpu' && <GpuArt g={{ id: 'x', vendor: 'player', name: '', year: 0, tflops: e.tflops, memGB: e.memGB, memTBs: 0, tdpW: e.tdpW, priceUsd: 0, mtbfH: 1 }} width={90} />}
                <div><h3>{d.spec.name} <span className={'tag ' + (d.status === 'ready' ? 'g' : 'a')}>{d.status === 'ready' ? 'in production' : `first silicon ${dateOf(d.readyTick)}`}</span></h3>
                  <div className="dim" style={{ fontSize: 13 }}>{node(d.spec.nodeId).name} · {d.spec.kind === 'gpu' ? `${num(e.tflops)} TFLOPS · ${num(e.memGB)} GB · ${e.tdpW} W` : `${d.spec.cpuCores} cores · score ${num(e.cpuScore)}`} · unit cost {money(e.unitCost)}</div></div></div>
              <div style={{ textAlign: 'right' }}><div style={{ fontSize: 22, fontWeight: 650 }}>{num(stock)}</div><div className="dim" style={{ fontSize: 12 }}>in stock · {num(d.sold)} sold · {money(d.revenue)}</div></div>
            </div>
            {d.status === 'designing' && <div className="bar"><i style={{ width: `${prog * 100}%` }} /></div>}
            {d.status === 'ready' && ec && <div className="row wrap" style={{ gap: 18, alignItems: 'end' }}>
              <Field label="Source"><select value={d.source} onChange={(ev) => act((x) => C.setProduction(x, d.id, d.wafersPerMonth, ev.target.value as 'foundry' | 'fab'))}><option value="foundry">Foundry (Taiwan Semiconductor-ish)</option><option value="fab" disabled={!w.silicon.fab}>Own fab</option></select></Field>
              <Field label={`Wafers / month ${d.wafersPerMonth} (cap ${num(ec.capPerMonth)}) · ${money(ec.waferUsd)}/wafer`}><input type="range" min={0} max={Math.max(1, ec.capPerMonth)} step={10} value={d.wafersPerMonth} onChange={(ev) => act((x) => C.setProduction(x, d.id, +ev.target.value, d.source))} /></Field>
              <Field label={`Sale price · ${num(C.chipDemandPerDay(w, d))}/day · parity ${money(C.parityPrice(w, d))} · ecosystem ${(C.ecosystem(w) * 100).toFixed(0)}%`}><Num value={d.salePrice} step={100} onChange={(p) => act((x) => C.setChipPrice(x, d.id, p))} /></Field>
              {d.spec.kind === 'gpu' && <><Field label="Build servers at"><select value={siteId} onChange={(ev) => setSite(ev.target.value)}>{w.sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Field>
                <button className="btn" disabled={stock < 8 || !siteId} onClick={() => act((x) => C.buildServersFromChips(x, d.id, siteId, Math.floor(stock / 8)), 'Servers assembled — check the loading dock')}>Assemble {Math.floor(stock / 8)} servers</button></>}
            </div>}
          </div>
        )
      })}
    </div>
  )
}

function FabView() {
  const w = useWorld(); const act = useGame((s) => s.act); const go = useGame((s) => s.go)
  const fab = w.silicon.fab
  if (!hasTech(w, 'fab')) return <EmptyState art={<WaferMap dieMm2={120} yieldFrac={0.95} size={220} seed={7} />} eyebrow="Fab · locked" title="Own the means of production." body="A leading-edge fab costs billions and the lithography scanners cost more than jets. In exchange: wafers at about 40% of foundry prices, and nobody can cut your allocation."><button className="btn pri" onClick={() => go('research')}>Open R&D</button></EmptyState>
  return (
    <div className="col" style={{ gap: 16 }}>
      <div className="panel row" style={{ justifyContent: 'space-between' }}>
        <div className="row" style={{ gap: 14 }}><Factory size={28} /><div><h3>{fab ? `Fab · ${fab.modules} cleanroom module${fab.modules > 1 ? 's' : ''}` : 'No fab yet'}</h3>
          <div className="dim" style={{ fontSize: 13 }}>{fab ? (w.tick < fab.readyTick ? `Construction completes ${dateOf(fab.readyTick)}` : `${Object.values(fab.tools).reduce((a, b) => a + b, 0)} scanners online · ${fab.toolsPending.length} being installed · 20 per module`) : 'Each module: $3.0B, 18 months, $1M/day to operate.'}</div></div></div>
        <button className="btn pri" onClick={() => void useGame.getState().confirmAct(fab ? 'Add a cleanroom module?' : 'Build your own fab?', PV.previewSpend(w, 3e9), 'Build', (x) => C.buildFab(x), { okMsg: fab ? 'Expansion started' : 'Fab construction started' })}>{fab ? 'Add module · $3.0B' : 'Build fab · $3.0B'}</button>
      </div>
      <div className="grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        {(Object.keys(LITHO) as LithoKind[]).map((k) => { const L = LITHO[k]; const locked = k !== 'duv' && !hasTech(w, L.tech); return (
          <div key={k} className="panel col" style={{ opacity: locked ? 0.5 : 1 }}>
            <div className="eyebrow">{L.maker}</div><h3>{L.name}</h3>
            <div className="dim" style={{ fontSize: 12.5, minHeight: 50 }}>{L.blurb}</div>
            <div style={{ fontSize: 13 }}>λ {L.wavelengthNm} nm · NA {L.na} · {L.wph} wafers/h</div>
            <div style={{ fontSize: 22, fontWeight: 650 }}>{fab ? fab.tools[k] : 0}<span className="dim" style={{ fontSize: 13, fontWeight: 500 }}> installed</span></div>
            <button className="btn sm pri" disabled={!fab || locked} onClick={() => void useGame.getState().confirmAct(`Buy a ${L.name}?`, PV.previewSpend(w, L.usd), 'Buy', (x) => C.buyLitho(x, k), { okMsg: 'Scanner ordered' })}>{locked ? 'Locked' : `Buy · ${money(L.usd)}`}</button>
          </div>) })}
      </div>
    </div>
  )
}
