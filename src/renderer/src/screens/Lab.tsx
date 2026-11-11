import { Select } from '../Select'
import { useDraft } from '../draft'
import { useState } from 'react'
import { FINETUNE_MAX_T, MODALITIES, baseOptions, foundryElo, methodOk, modalityOk, type Method, type Modality, bestRivalElo, modalityRivals } from '@sim/foundry'
import { AudioLines, Music, Clapperboard, Code2, Image as ImageIcon, MessageSquare, Sparkles } from 'lucide-react'
import * as A from '@sim/actions'
import { GPUS_PER_SERVER } from '@sim/data/hardware'
import { eloFromLoss, goodput, modelLoss, referencePrice, trainFlops, trainMemoryGB, trainingMfu } from '@sim/ai'
import { DataFoundry } from './Systems'
import { trainingOutlook, type Outlook } from '@sim/progress'
import { OWN_SIZES, datasetById, datasetCatalog, daysToNextDataset, EVALS, RIVAL_MIX, TEMPLATES, archLossDelta, archStats, evalScore, type ArchSpec } from '@sim/models'
import { NetFlow, type NetNode } from '../art/NetFlow'
import { CLOUD, cloudCapacity, cloudGpus, cloudRate } from '@sim/cloud'
import { CorpLogo } from '../art/Logos'
import { committed, gpu, hallServers, hasTech, techLevel, techSum, worstFabric, yearOf } from '@sim/util'
import { dateOf, dur, flops, money, num, params } from '../format'
import { useGame, useWorld } from '../store'
import { Bar, Field, Num, Summary, Tabs, Term } from '../ui'
import * as PV from '@sim/preview'
import * as Sum from '../summaries'

const TABS = ['design', 'data', 'foundry', 'runs', 'models', 'evals'] as const

export function Lab() {
  const w = useWorld()
  const [tab, setTab] = useDraft<(typeof TABS)[number]>('lab.tab', w.runs.some((r) => r.status === 'running') ? 'runs' : 'design')
  return (
    <>
      <div className="page-head"><div><div className="eyebrow">Research lab</div><h1>Design a mind</h1></div><Tabs tabs={TABS} value={tab} onChange={setTab} labels={{ design: 'Design', data: 'Buy data', foundry: 'Make data', runs: 'Training runs', models: 'Your models', evals: 'Benchmarks' }} /></div>
      <Summary items={Sum.labSummary(w)} />
      {tab === 'design' && <Design onStart={() => setTab('runs')} onData={() => setTab('data')} />}
      {tab === 'data' && <DataMarket />}
      {tab === 'foundry' && <DataFoundry />}
      {tab === 'runs' && <Runs />}
      {tab === 'models' && <Models />}
      {tab === 'evals' && <Evals />}
    </>
  )
}

const METHOD_LABEL: Record<Method, string> = { scratch: 'Train from scratch', finetune: 'Fine-tune a base', distill: 'Distil a teacher', continue: 'Pre-train an open model on your data' }
const METHOD_BLURB: Record<Method, string> = {
  scratch: 'Random init. Full price, full freedom.', finetune: 'Start from a base. Cheap, fast, small capped gain.',
  distill: 'A smaller student copies a stronger teacher: most of the gap, never past it.', continue: 'Keep pre-training a base on new tokens. Tokens add up.'
}
const MOD_ICON: Record<Modality, React.ReactNode> = { text: <MessageSquare size={18} />, code: <Code2 size={18} />, image: <ImageIcon size={18} />, speech: <AudioLines size={18} />, music: <Music size={18} />, video: <Clapperboard size={18} />, omni: <Sparkles size={18} /> }

function Design({ onStart, onData }: { onStart: () => void; onData: () => void }) {
  const w = useWorld(); const act = useGame((s) => s.act)
  const [tpl, setTpl] = useDraft('lab.tpl', 'own-s')
  const [arch, setArch] = useDraft<ArchSpec>('lab.arch', () => ({ ...OWN_SIZES.find((t) => t.id === 'own-s')!.arch }))
  const [sel, setSel] = useDraft<NetNode | null>('lab.sel', 'block')
  const [name, setName] = useDraft('lab.name', () => A.randomModelName(w) + '-1')
  const [modality, setModality] = useDraft<Modality>('lab.modality', 'text')
  const [method, setMethod] = useDraft<Method>('lab.method', 'scratch')
  const bases = baseOptions(w)
  const [baseId, setBaseId] = useDraft('lab.baseId', bases[0]?.id ?? '')
  const base = method === 'scratch' ? undefined : bases.find((b) => b.id === baseId) ?? bases[0]
  const owned = Object.keys(w.datasets).filter((id) => (w.datasets[id] ?? 0) > 0).map((id) => datasetById(id, w.data?.own)).filter((d) => !!d)
  const [mix, setMix] = useDraft<Record<string, number>>('lab.mix', () => Object.fromEntries(owned.map((d) => [d.id, Math.min(d.tokensT, 2)])))
  const [siteId, setSite] = useDraft('lab.siteId', w.sites.find((s) => s.halls.some((h) => h.racks.some((r) => r.servers > 0)))?.id ?? CLOUD)
  const cloud = siteId === CLOUD
  const site = w.sites.find((s) => s.id === siteId)
  const gpuIds = cloud ? cloudGpus(w).map((g) => g.id) : site ? [...new Set(site.halls.flatMap((h) => h.racks.map((r) => r.gpuId).filter(Boolean)))] : []
  const [gpuId, setGpu] = useDraft('lab.gpuId', '')
  const gid = gpuIds.includes(gpuId) ? gpuId : gpuIds[gpuIds.length - 1] ?? ''
  const free = cloud && gid ? cloudCapacity(w, gid) : site && gid ? site.halls.reduce((acc, h) => acc + hallServers(h, gid), 0) - committed(w, siteId, gid) : 0
  const [servers, setServers] = useDraft('lab.servers', 16)
  const n = Math.max(1, Math.min(servers, Math.max(1, free)))
  const up = (p: Partial<ArchSpec>): void => { setArch((x) => ({ ...x, ...p })); setTpl('custom') }
  const st = archStats(arch)
  const m = A.mixSummary(w, mix)
  const loss = modelLoss(st.totalB, st.activeB, Math.max(m.tokensT, 0.001), arch.experts > 1, m.quality || 1) + archLossDelta(arch)
  const scratchElo = eloFromLoss(method === 'continue' && base ? modelLoss(base.paramsB, base.activeParamsB, m.tokensT + base.tokensT, base.moe, m.quality || 1) : loss) + techSum(w, 'elo')
  const elo = foundryElo(method, scratchElo, base, m.tokensT, m.quality || 1, modality) + techSum(w, 'elo-' + modality)
  const usesBase = !!base && method !== 'distill'
  const F = trainFlops(usesBase ? base!.activeParamsB : st.activeB, m.tokensT)
  const g = gid ? gpu(w, gid) : null
  const mfu = (site || cloud) && gid ? trainingMfu(w, n, cloud ? 'ib400' : worstFabric(site!, gid)) : 0
  const bill = cloud && g ? cloudRate(w, g) * n * 8 : 0
  const rate = g ? n * 8 * g.tflops * 1e12 * mfu * goodput(w, n, g) : 0
  const memNeed = trainMemoryGB(usesBase ? base!.paramsB : st.totalB), memHave = g ? 0.75 * n * 8 * g.memGB : 0
  const evals = EVALS.map((e) => ({ e, v: evalScore(e, elo, m.tokensT ? m.shares : RIVAL_MIX, techLevel(w, 'reasoning')) }))
  const field = (label: string, v: number, min: number, max: number, step: number, k: keyof ArchSpec, log = false) => (
    <Field label={`${label}: ${num(v)}`}><input type="range" min={log ? Math.log2(min) : min} max={log ? Math.log2(max) : max} step={log ? 0.01 : step} value={log ? Math.log2(v) : v}
      onChange={(ev) => { let x = +ev.target.value; if (log) x = Math.round(2 ** x / step) * step; up({ [k]: x } as Partial<ArchSpec>) }} /></Field>)
  return (
    <div className="col" style={{ gap: 16 }}>
      <div className="panel col foundry" style={{ gap: 14 }}>
        <div className="row" style={{ justifyContent: 'space-between' }}><h3><Step n={1} />What are you making?</h3><span className="dim" style={{ fontSize: 12.5 }}>Each modality is its own business line: own price, own demand.</span></div>
        <div className="modality-grid">{(Object.keys(MODALITIES) as Modality[]).map((k, i) => {
          const md = MODALITIES[k], ok = modalityOk(w, k)
          return <button key={k} className={'modality' + (modality === k ? ' on' : '') + (ok ? '' : ' locked')} style={{ animationDelay: `${i * 40}ms` }} onClick={() => ok ? setModality(k) : useGame.getState().go('research')}>
            <span className="mi">{MOD_ICON[k]}</span><b>{md.name}</b><span>{ok ? md.blurb : 'Locked · research in R&D → Modalities'}</span>
            <em>price ×{md.price} · demand ×{md.demand}</em></button>
        })}</div>
        <div className="rivals-strip"><span className="dim">In {MODALITIES[modality].name.toLowerCase()} you race</span>
          {modalityRivals(w, modality).sort((a, b) => b.elo - a.elo).slice(0, 4).map((c) => <span key={c.corp} className="rival-chip"><b>{c.name}</b>{c.maker ? <i>{c.maker}</i> : null}<em>{Math.round(c.elo)}</em></span>)}
          {(() => { const best = Math.max(0, ...w.models.filter((x) => x.releasedByPlayer && (x.modality ?? 'text') === modality).map((x) => x.elo)); return <span className="rival-chip you"><b>Your best</b><em>{best ? Math.round(best) : 'none yet'}</em></span> })()}
        </div>
        <div className="row wrap" style={{ gap: 14, alignItems: 'center' }}>
          <div className="methods">
          {([['scratch', 'Nothing', 'Highest', 'Longest', 'A model that is truly yours; frontier ambitions.'], ['continue', 'An open or own model', 'High', 'Long', 'Teaching a strong base your own domain with lots of tokens.'], ['finetune', 'An open or own model', 'Low', 'Short', 'A cheap specialist; capped gain.'], ['distill', 'A stronger teacher', 'Low–medium', 'Short', 'A small fast model that copies a big one.']] as const).map(([k, from, cost, time, use]) => <button key={k} className={'method' + (method === k ? ' on' : '')} aria-pressed={method === k} disabled={!methodOk(w, k)} title={methodOk(w, k) ? undefined : 'Needs research'} onClick={() => setMethod(k)}><b>{METHOD_LABEL[k]}</b><span className="meta">Starts from {from} · {cost} cost · {time}</span><span>{use}</span></button>)}
        </div>
          {method !== 'scratch' && <Select value={base?.id ?? ''} onChange={(e) => setBaseId(e.target.value)} style={{ maxWidth: 360 }}>{(['own', 'open'] as const).map((k) => bases.some((b) => b.kind === k) && <optgroup key={k} label={k === 'own' ? 'Your models' : 'Open weights published by rivals'}>{bases.filter((b) => b.kind === k).map((b) => <option key={b.id} value={b.id}>{b.name} · {params(b.paramsB)} · Elo {Math.round(b.elo)}</option>)}</optgroup>)}</Select>}
          <span className="dim" style={{ fontSize: 12.5 }}>{METHOD_BLURB[method]}{method === 'finetune' ? ` Max ${FINETUNE_MAX_T * 1000}B tokens.` : ''}{base && base.modality !== modality ? ' Cross-modal: −60 Elo while it adapts.' : ''}</span>
        </div>
      </div>
      {usesBase ? <ComputePlan base={base!} method={method} g={g} F={F} n={n} free={free} mfu={mfu} good={g ? goodput(w, n, g) : 0} rate={rate} memNeed={memNeed} memHave={memHave} cloud={cloud} bill={bill} tokensT={m.tokensT}
        siteId={siteId} setSite={setSite} gid={gid} setGpu={setGpu} gpuIds={gpuIds} setServers={setServers} /> : <>
      <div className="panel col" style={{ gap: 12 }}>
        <div className="row" style={{ justifyContent: 'space-between' }}><h3><Step n={2} />Shape the model</h3><span className="dim" style={{ fontSize: 12.5 }}>Pick a starting size, then fine-tune it in the diagram below. Bigger is smarter, slower and hungrier for data.</span></div>
        <div className="own-label"><span className="yours-dot" style={{ background: w.logo.color }} />Your own design, from scratch</div>
        <div className="row" style={{ gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
          {OWN_SIZES.map((t) => { const s2 = archStats(t.arch); return (
            <button key={t.id} className={'adv' + (tpl === t.id ? ' on' : '')} style={{ gridTemplateColumns: '1fr', minWidth: 190 }} title={t.blurb} onClick={() => { setTpl(t.id); setArch({ ...t.arch }); setName(A.randomModelName(w) + '-1') }}>
              <span><b>{t.name}</b> · {params(s2.totalB)}<br /><span>{t.blurb}</span></span>
            </button>) })}
        </div>
        <div className="own-label dim">Or copy a recipe a rival has published (you still train it yourself, and it becomes yours)</div>
        <div className="row" style={{ gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
          {TEMPLATES.map((t) => { const s2 = archStats(t.arch); return (
            <button key={t.id} className={'adv' + (tpl === t.id ? ' on' : '')} style={{ gridTemplateColumns: '30px 1fr', minWidth: 200 }} title={t.blurb} onClick={() => { setTpl(t.id); setArch({ ...t.arch }); setName(t.name.replace(/[^A-Za-z0-9]+/g, '-') + '-remix') }}>
              <span>{t.corp ? <CorpLogo id={t.corp} size={28} /> : <span style={{ fontSize: 20 }}>🌌</span>}</span>
              <span><b>{t.name}</b><br /><span>{params(s2.totalB)}{t.arch.experts > 1 ? ` · ${params(s2.activeB)} active` : ''}</span></span>
            </button>) })}
        </div>
        {tpl === 'custom' && <div className="dim" style={{ fontSize: 12.5 }}>You have changed the shape: this is now your own custom design.</div>}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1.25fr 1fr', gap: 16, alignItems: 'start' }}>
        <div className="panel" style={{ padding: 10 }}><NetFlow a={arch} selected={sel} onSelect={setSel} /></div>
        <div className="col" style={{ gap: 12 }}>
          <div className="panel col" style={{ gap: 10 }}>
            <div className="row" style={{ justifyContent: 'space-between' }}><h3>{sel === 'embed' ? 'Embedding' : sel === 'attn' ? 'Attention' : sel === 'ffn' ? (arch.experts > 1 ? 'Mixture of experts' : 'Feed-forward') : sel === 'head' ? 'Output head' : 'Block stack'}</h3><span className="tag b">click the diagram</span></div>
            {(sel === 'block' || !sel) && <>{field('Layers', arch.layers, 2, 1000, 1, 'layers')}{field('d_model', arch.dModel, 256, 131072, 128, 'dModel', true)}</>}
            {sel === 'embed' && <>{field('Vocabulary (k)', arch.vocabK, 8, 512, 1, 'vocabK')}{field('Context (k tokens)', arch.ctxK, 1, 10000, 1, 'ctxK', true)}</>}
            {sel === 'attn' && <>
              <div className="tabs" style={{ marginBottom: 0 }}>{(['mha', 'gqa', 'mla'] as const).map((k) => <button key={k} className={arch.attn === k ? 'on' : ''} onClick={() => up({ attn: k })}>{k.toUpperCase()}</button>)}</div>
              {field('Heads', arch.heads, 1, 1024, 1, 'heads', true)}{arch.attn === 'gqa' && field('KV heads', arch.kvHeads, 1, arch.heads, 1, 'kvHeads')}{field('Context (k tokens)', arch.ctxK, 1, 10000, 1, 'ctxK', true)}</>}
            {sel === 'ffn' && <>
              {field('FFN multiplier', arch.ffnMult, 0.1, 8, 0.05, 'ffnMult')}
              {field('Experts', arch.experts, 1, 1_000_000, 1, 'experts', true)}
              {arch.experts > 1 && <>{field('Top-k routed', arch.topK, 1, Math.min(64, arch.experts), 1, 'topK')}{field('Shared experts', arch.shared, 0, 8, 1, 'shared')}</>}
              {arch.experts > 1 && !hasTech(w, 'moe') && <span className="neg" style={{ fontSize: 12.5 }}>MoE needs research before you can train it.</span>}</>}
            {sel === 'head' && <p className="dim" style={{ fontSize: 13 }}>Tied to the embedding. Bigger vocabularies compress text better but cost parameters; ~128k is the sweet spot.</p>}
          </div>
          <div className="grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            {[['Total params', params(st.totalB)], ['Active / token', params(st.activeB)], ['KV cache / token', `${num(st.kvBytesPerToken / 1024)} KB`], ['Training compute', flops(F)], ['Expected loss', loss.toFixed(3)], ['Expected Elo', `${Math.round(elo)}`]].map(([k, v]) =>
              <div key={k} className="panel" style={{ padding: '10px 12px' }}><div className="dim" style={{ fontSize: 11.5 }}>{k}</div><div style={{ fontSize: 17, fontWeight: 650 }}>{v}</div></div>)}
          </div>
          <div className="panel col" style={{ gap: 6 }}>
            <div className="row" style={{ justifyContent: 'space-between' }}><b style={{ fontSize: 13 }}>Predicted benchmark scores</b><span className="dim" style={{ fontSize: 12 }}>from scale × data mix</span></div>
            {evals.map(({ e, v }) => <div key={e.id} style={{ display: 'grid', gridTemplateColumns: '130px 1fr 44px', gap: 10, alignItems: 'center', fontSize: 12.5 }} title={e.parody}><span>{e.name}</span><div className="bar"><i style={{ width: `${v}%` }} /></div><span style={{ textAlign: 'right', fontWeight: 600 }}>{v.toFixed(0)}</span></div>)}
          </div>
        </div>
      </div>
      </>}
      <div className="panel col" style={{ gap: 12 }}>
        <div className="row" style={{ justifyContent: 'space-between' }}><h3><Step n={3} />Feed it data</h3><button className="btn sm ghost" onClick={onData}>Dataset market</button></div>
        {owned.length === 0 ? <p className="dim">You own no data. Grab the free web crawl in the dataset market — or something less legal.</p> :
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>{owned.map((d) => (
            <Field key={d.id} label={`${d.name} · ${(mix[d.id] ?? 0).toFixed(2)}T of ${d.tokensT}T${(mix[d.id] ?? 0) > d.tokensT ? ` · ${((mix[d.id] ?? 0) / d.tokensT).toFixed(1)} epochs` : ''}`}>
              <input type="range" min={0} max={d.tokensT * 4} step={d.tokensT / 100} value={mix[d.id] ?? 0} onChange={(ev) => setMix({ ...mix, [d.id]: +ev.target.value })} /></Field>))}</div>}
        <div className="dim" style={{ fontSize: 12.5 }}>{m.tokensT.toFixed(2)}T tokens · quality ×{(m.quality || 0).toFixed(2)} · {((m.tokensT * 1000) / Math.max(st.activeB, 1e-9)).toFixed(0)} tokens/param (Chinchilla ≈ 20){m.error ? ` · ${m.error}` : ''}</div>
      </div>
      <OutlookCard elo={elo} rival={bestRivalElo(w, modality)} hours={rate > 0 ? F / rate / 3600 : Infinity} cost={cloud ? bill * (rate > 0 ? F / rate / 3600 : 0) : 0} servers={n} ready={m.tokensT > 0 && !!gid}
        outlook={trainingOutlook((sm, dm) => foundryElo(method, eloFromLoss(method === 'continue' && base ? modelLoss(base.paramsB, base.activeParamsB, m.tokensT * dm + base.tokensT, base.moe, m.quality || 1) : modelLoss(st.totalB * sm, st.activeB * sm, Math.max(m.tokensT * dm, 0.001), arch.experts > 1, m.quality || 1) + archLossDelta(arch)) + techSum(w, 'elo'), base, m.tokensT * dm, m.quality || 1, modality))} />
      <div className="panel row wrap" style={{ gap: 14, alignItems: 'end' }}>
        <h3 style={{ alignSelf: 'center' }}><Step n={5} />Train</h3>
        <Field label="Model name"><input type="text" value={name} onChange={(e) => setName(e.target.value)} /></Field>
        <Field label="Compute"><Select value={siteId} onChange={(e) => setSite(e.target.value)}>{w.sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}<option value={CLOUD}>☁ Rent from Amazoon cloud</option></Select></Field>
        <Field label="GPU"><Select value={gid} onChange={(e) => setGpu(e.target.value)}>{gpuIds.map((id) => <option key={id} value={id}>{gpu(w, id).name}</option>)}</Select></Field>
        <Field label={`Servers ${n}/${free} · ${num(n * 8)} GPUs`}><input type="range" min={1} max={Math.max(1, free)} value={n} onChange={(e) => setServers(+e.target.value)} /></Field>
        <div className="dim" style={{ fontSize: 12.5 }}><Term k="mfu">MFU</Term> {(mfu * 100).toFixed(0)}% · ETA {dur(rate > 0 ? F / rate / 3600 : Infinity)}{cloud ? ` · ${money(bill)}/h ≈ ${money(bill * (rate > 0 ? F / rate / 3600 : 0))} total` : ''}<br /><span style={{ color: memNeed > memHave ? 'var(--red)' : undefined }}>memory {num(memNeed)} / {num(memHave)} GB</span></div>
        <button className="btn pri" onClick={() => { void useGame.getState().confirmAct(`Start training ${name}?`, PV.previewTraining(w, cloud ? bill * (rate > 0 ? F / rate / 3600 : 0) : 0), 'Train', (x) => A.startArchTraining(x, { name, arch, mix, siteId, gpuId: gid, servers: n, modality, method, baseId: base?.id }), { okMsg: 'Training started' }).then((r) => { if (r?.ok) onStart() }) }}>Start training</button>
      </div>
    </div>
  )
}

interface PlanProps { base: { name: string; paramsB: number; activeParamsB: number; tokensT: number; elo: number }; method: Method; g: ReturnType<typeof gpu> | null; F: number; n: number; free: number; mfu: number; good: number; rate: number; memNeed: number; memHave: number; cloud: boolean; bill: number; tokensT: number
  siteId: string; setSite: (v: string) => void; gid: string; setGpu: (v: string) => void; gpuIds: string[]; setServers: (v: number) => void }
/** Replaces the architecture editor when the base model fixes the shape: the compute plan that decides time, cost and risk. */
function ComputePlan(p: PlanProps) {
  const w = useWorld()
  const { g, n, rate, F } = p
  const hours = rate > 0 ? F / rate / 3600 : Infinity
  const peakPf = g ? (n * 8 * g.tflops) / 1000 : 0
  const kw = g ? (n * 8 * g.tdpW * 1.35) / 1000 : 0
  const memOk = p.memHave >= p.memNeed
  const tokPerSec = rate > 0 ? rate / (6 * p.base.activeParamsB * 1e9) : 0
  const failsPerDay = g ? (n * 8 * 24) / g.mtbfH : 0
  const rows: [string, string, string][] = [
    ['Work to do', flops(F), `${p.tokensT.toFixed(2)}T new tokens through a ${params(p.base.activeParamsB)} model (6 × params × tokens)`],
    ['Cluster peak', g ? `${num(peakPf)} PFLOPS` : '—', `${num(n * 8)} × ${g?.name ?? 'GPU'}`],
    ['Real speed', `${num(rate / 1e15)} PFLOPS`, `${(p.mfu * 100).toFixed(0)}% utilisation (MFU, set by network and research) × ${(p.good * 100).toFixed(0)}% goodput (time lost to failures)`],
    ['Throughput', `${num(tokPerSec)} tok/s`, 'Tokens trained per second across the cluster'],
    ['Time', dur(hours), p.cloud ? 'Billed by the hour in the cloud' : 'Your servers are busy and unavailable for anything else meanwhile'],
    ['Failures', `${failsPerDay.toFixed(1)} / day`, 'Each costs a restart from the last checkpoint. Checkpoint research and engineers shrink the loss'],
    ['Power', g ? `${kw.toFixed(0)} kW` : '—', g ? `${(kw * hours).toLocaleString('en', { maximumFractionDigits: 0 })} kWh for the whole run, on top of the hall's cooling` : ''],
    ['Cost', p.cloud ? money(p.bill * (rate > 0 ? hours : 0)) : 'Your own hardware', p.cloud ? `${money(p.bill)}/h for ${n} servers` : 'No bill, but power and the opportunity cost of idle serving']
  ]
  return (
    <div className="panel col" style={{ gap: 12 }}>
      <div className="row" style={{ justifyContent: 'space-between' }}><h3><Step n={2} />Plan the compute</h3>
        <span className="dim" style={{ fontSize: 12.5 }}>The shape comes from <b>{p.base.name}</b> ({params(p.base.paramsB)}, Elo {Math.round(p.base.elo)}). {p.method === 'continue' ? 'You add tokens; the compute decides how long that takes.' : 'A small, cheap pass; the compute decides the time.'}</span></div>
      <div className="row wrap" style={{ gap: 14, alignItems: 'end' }}>
        <Field label="Where"><Select value={p.siteId} onChange={(e) => p.setSite(e.target.value)}>{w.sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}<option value={CLOUD}>☁ Rent from Amazoon cloud</option></Select></Field>
        <Field label="GPU"><Select value={p.gid} onChange={(e) => p.setGpu(e.target.value)}>{p.gpuIds.map((id) => <option key={id} value={id}>{gpu(w, id).name}</option>)}</Select></Field>
        <Field label={`Servers ${p.n}/${p.free}`}><input type="range" min={1} max={Math.max(1, p.free)} value={p.n} onChange={(e) => p.setServers(+e.target.value)} /></Field>
      </div>
      <table><tbody>{rows.map(([k, v, note]) => <tr key={k}><td style={{ width: 130 }}><b>{k}</b></td><td className="r" style={{ width: 170 }}>{v}</td><td className="dim" style={{ fontSize: 12.5 }}>{note}</td></tr>)}</tbody></table>
      <div><div className="row" style={{ justifyContent: 'space-between', fontSize: 12.5 }}><span><b>GPU memory</b> needed to hold weights, gradients and optimiser</span><span className={memOk ? '' : 'neg'}>{num(p.memNeed)} GB of {num(p.memHave)} GB</span></div>
        <Bar v={p.memHave > 0 ? p.memNeed / p.memHave : 2} />
        {!memOk && <div className="usage-alert" role="alert" style={{ marginTop: 8 }}>Not enough GPU memory: add servers or pick a smaller base, or the run will not start.</div>}</div>
    </div>
  )
}

function DataMarket() {
  const w = useWorld()
  const year = yearOf(w.tick)
  const all = datasetCatalog(year)
  const isOwned = (id: string): boolean => (w.datasets[id] ?? 0) > 0
  const fixed = all.filter((d) => !d.id.startsWith('gen-') && !isOwned(d.id))
  // newest editions first; older unsold volumes drop off the shelf so the market stays readable
  const editions = all.filter((d) => d.id.startsWith('gen-') && !isOwned(d.id)).reverse().slice(0, 12)
  const owned = all.filter((d) => isOwned(d.id))
  const card = (d: (typeof all)[number]): React.ReactNode => { const own = isOwned(d.id); const locked = (d.needsTech && !hasTech(w, d.needsTech)) || d.year > year + 0.5; return (
    <div key={d.id} className="panel lift col" style={{ gap: 8, opacity: locked ? 0.5 : 1 }}>
      <div className="row" style={{ justifyContent: 'space-between' }}><span className="tag b">{d.domain}</span>{d.legalRisk > 0.4 ? <span className="tag r">legal risk {(d.legalRisk * 100).toFixed(0)}%</span> : d.legalRisk > 0.1 ? <span className="tag a">some risk</span> : <span className="tag g">clean</span>}</div>
      <h3>{d.name}</h3><div className="dim" style={{ fontSize: 12.5 }}>{d.source}</div>
      <div className="row" style={{ gap: 18, fontSize: 13 }}><span><b>{num(d.tokensT)}T</b> tokens</span><span>quality <b>×{d.quality}</b></span></div>
      <button className={'btn sm ' + (own ? 'ghost' : 'pri')} disabled={own || !!locked} onClick={() => void useGame.getState().confirmAct(`Buy ${d.name}?`, PV.previewSpend(w, d.usd), 'Buy', (x) => A.buyDataset(x, d.id))}>{own ? 'Owned' : locked ? 'Locked' : d.usd === 0 ? 'Download free' : `Buy · ${money(d.usd)}`}</button>
    </div>) }
  const grid: React.CSSProperties = { gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))', gap: 12 }
  return (
    <div className="col" style={{ gap: 18 }}>
      <p className="dim" style={{ fontSize: 13 }}><b style={{ color: 'var(--tx)' }}>Next edition in {daysToNextDataset(year)} days.</b> A new, larger dataset goes on sale every quarter, so the market never runs dry. What you buy moves to your library below.</p>
      {editions.length > 0 && <><h3>New this year</h3><div className="grid" style={grid}>{editions.map(card)}</div></>}
      {fixed.length > 0 && <><h3>Catalogue</h3><div className="grid" style={grid}>{fixed.map(card)}</div></>}
      {owned.length > 0 && <><h3>Your library · {owned.length}</h3><div className="grid" style={grid}>{owned.map(card)}</div></>}
    </div>
  )
}

const Step = ({ n }: { n: number }): React.ReactNode => <span className="step-n">{n}</span>
function Curve({ title, pts, unit }: { title: string; pts: { x: number; elo: number }[]; unit: string }) {
  const lo = Math.min(...pts.map((p) => p.elo)), hi = Math.max(...pts.map((p) => p.elo)), rg = hi - lo || 1
  const xy = pts.map((p, i) => [(i / (pts.length - 1)) * 200, 58 - ((p.elo - lo) / rg) * 52] as const)
  const mid = xy[2], gain = pts[3].elo - pts[2].elo
  return (
    <div className="curve">
      <div className="row" style={{ justifyContent: 'space-between' }}><b>{title}</b><span className="dim">2× {unit} → {gain >= 0 ? '+' : ''}{Math.round(gain)} Elo</span></div>
      <svg viewBox="0 0 200 64" preserveAspectRatio="none" aria-hidden><polyline fill="none" stroke="var(--accent)" strokeWidth="2" vectorEffect="non-scaling-stroke" points={xy.map((p) => p.join(',')).join(' ')} /><line x1={mid[0]} x2={mid[0]} y1={0} y2={64} stroke="var(--line)" strokeDasharray="3 3" vectorEffect="non-scaling-stroke" /></svg>
      <div className="axis"><span>¼×</span><span>you are here</span><span>4×</span></div>
    </div>
  )
}
function OutlookCard({ elo, rival, hours, cost, servers, outlook, ready }: { elo: number; rival: number; hours: number; cost: number; servers: number; outlook: Outlook; ready: boolean }) {
  const gap = Math.round(elo - rival)
  return (
    <div className="panel outlook">
      <div className="row" style={{ justifyContent: 'space-between' }}><h3><Step n={4} />What you'll get</h3><span className="dim" style={{ fontSize: 12.5 }}>Three levers: model size and data decide quality, GPUs decide speed.</span></div>
      {!ready ? <p className="dim">Add some training data and pick GPUs to see the forecast.</p> : <>
        <div className="outlook-nums">
          <div><span className="k">Expected quality</span><span className="v">{Math.round(elo)} Elo</span><span className={gap >= 0 ? 'pos' : 'dim'} style={{ fontSize: 12.5 }}>{gap >= 0 ? `${gap} ahead of the best rival` : `${-gap} behind the best rival`}</span></div>
          <div><span className="k">Time to train</span><span className="v">{dur(hours)}</span><span className="dim" style={{ fontSize: 12.5 }}>on {num(servers * 8)} GPUs · {dur(hours / 2)} with twice as many</span></div>
          <div><span className="k">Cost</span><span className="v">{cost > 0 ? money(cost) : 'Your own GPUs'}</span><span className="dim" style={{ fontSize: 12.5 }}>{cost > 0 ? 'cloud rental for the whole run' : 'power only; they earn no rent meanwhile'}</span></div>
        </div>
        <div className="outlook-verdict">{outlook.verdict}</div>
        <div className="outlook-curves"><Curve title="Model size" pts={outlook.size} unit="size" /><Curve title="Training data" pts={outlook.data} unit="data" /></div>
      </>}
    </div>
  )
}

function Evals() {
  const w = useWorld()
  const rows = [
    ...w.competitors.map((c) => ({ name: c.name, corp: c.corp, evals: Object.fromEntries(EVALS.map((e) => [e.id, evalScore(e, c.elo, RIVAL_MIX, Math.max(0, (w.tick / 8766) - 1.5))])), you: false })),
    ...w.models.map((m) => ({ name: m.name, corp: '', evals: m.evals ?? {}, you: true }))
  ]
  return (
    <div className="panel" style={{ padding: 8, overflowX: 'auto' }}>
      <table><thead><tr><th>Model</th>{EVALS.map((e) => <th key={e.id} className="r" title={e.parody}>{e.name}</th>)}</tr></thead><tbody>
        {rows.sort((a, b) => (b.evals.mmlu ?? 0) - (a.evals.mmlu ?? 0)).map((r, i) => <tr key={r.name + i} style={r.you ? { background: 'var(--accent-soft)' } : undefined}>
          <td><span className="row" style={{ gap: 8 }}>{r.corp && <CorpLogo id={r.corp} size={22} />}<b style={{ fontWeight: 600 }}>{r.name}</b></span></td>
          {EVALS.map((e) => { const v = r.evals[e.id] ?? 0; const best = Math.max(...rows.map((x) => x.evals[e.id] ?? 0)); return <td key={e.id} className="r" style={{ fontWeight: v === best ? 700 : 450, color: v === best ? 'var(--accent)' : undefined }}>{v.toFixed(1)}</td> })}
        </tr>)}
      </tbody></table>
    </div>
  )
}

function Runs() {
  const w = useWorld(); const act = useGame((s) => s.act)
  if (!w.runs.length) return <p className="dim">No training runs yet.</p>
  return (
    <div className="col" style={{ gap: 14 }}>
      {[...w.runs].reverse().map((r) => {
        const p = r.flopsDone / r.flopsTotal
        const site = w.sites.find((s) => s.id === r.siteId)
        return (
          <div key={r.id} className="panel col">
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <div><h3>{r.name} <span className={'tag ' + (r.status === 'running' ? 'run' : r.status === 'paused' ? 'pause' : r.status === 'done' ? 'live' : 'off')}>{r.status === 'done' ? 'finished' : r.status}</span> {r.owner !== 'player' && <span className="tag a">contract</span>}</h3>
                <div className="dim" style={{ fontSize: 12 }}>{num(r.paramsB)}B{r.moe ? ' MoE' : ''} · {r.tokensT}T tokens · {r.servers * 8} × {gpu(w, r.gpuId).name} @ {r.siteId === CLOUD ? '☁ cloud' : site?.name} · started {dateOf(r.startTick)}</div></div>
              <div className="row">
                {r.status === 'running' && <button className="btn sm" onClick={() => act((x) => A.setRunStatus(x, r.id, 'paused'))}>Pause</button>}
                {r.status === 'paused' && <button className="btn sm" onClick={() => act((x) => A.setRunStatus(x, r.id, 'running'))}>Resume</button>}
                {(r.status === 'running' || r.status === 'paused') && <button className="btn sm danger" onClick={() => void useGame.getState().confirmAct(`Abort ${r.name}?`, { tier: 'severe', lines: [`${money(r.spentUsd)} of compute already spent is lost`, `${Math.round(100 * r.flopsDone / r.flopsTotal)}% of training thrown away`] }, 'Abort', (x) => A.setRunStatus(x, r.id, 'failed'), { okMsg: 'Run aborted' })}>Abort</button>}
              </div>
            </div>
            <Bar v={p} max={1} warnAt={2} badAt={2} />
            <div className="row mono" style={{ gap: 28, fontSize: 12 }}>
              <span>{(p * 100).toFixed(1)}%</span><span className="dim">MFU {(r.mfu * 100).toFixed(0)}%</span><span className="dim">ETA {r.status === 'running' ? dur(r.etaH) : '—'}</span><span className="dim">{flops(r.flopsDone)} / {flops(r.flopsTotal)}</span><span className="dim">rollbacks {r.restarts}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function Models() {
  const w = useWorld(); const act = useGame((s) => s.act)
  if (!w.models.length) return <p className="dim">You have no models yet. Design one in the first tab and finish a training run; it will appear here. Rivals' models are listed under World → Ranks.</p>
  return (
    <div className="col" style={{ gap: 14 }}>
      <div className="own-label"><span className="yours-dot" style={{ background: w.logo.color }} />Your models · {w.models.length}<span className="dim" style={{ fontWeight: 500 }}>Everything here belongs to {w.company}. Rivals' models are under World → Ranks.</span></div>
      {w.models.map((m) => <ModelCard key={m.id} id={m.id} />)}
      <p className="dim" style={{ fontSize: 12 }}>{act.length ? '' : ''}Demand is split by a quality-vs-price softmax across every model on the leaderboard. Capacity short? You lose the surplus and your reputation takes a hit.</p>
    </div>
  )
}

function ModelCard({ id }: { id: string }) {
  const w = useWorld(); const act = useGame((s) => s.act); const confirmAct = useGame((s) => s.confirmAct)
  const m = w.models.find((x) => x.id === id)!
  const deps = w.deployments.filter((d) => d.modelId === id)
  const [siteId, setSite] = useDraft(`card.${id}.siteId`, w.sites[0]?.id ?? CLOUD)
  const cloud = siteId === CLOUD
  const site = w.sites.find((s) => s.id === siteId)
  const gpuIds = cloud ? cloudGpus(w).map((g) => g.id) : site ? [...new Set(site.halls.flatMap((h) => h.racks.map((r) => r.gpuId).filter(Boolean)))] : []
  const [gpuId, setGpu] = useDraft(`card.${id}.gpuId`, gpuIds[0] ?? '')
  const gid = gpuIds.includes(gpuId) ? gpuId : gpuIds[gpuIds.length - 1] ?? ''
  const free = cloud && gid ? cloudCapacity(w, gid) : site && gid ? site.halls.reduce((a, h) => a + hallServers(h, gid), 0) - committed(w, siteId, gid) : 0
  const [servers, setServers] = useDraft(`card.${id}.servers`, 8)
  const [price, setPrice] = useDraft(`card.${id}.price`, () => +referencePrice(w.tick / 8766, m.elo).toFixed(2))
  const existing = deps.reduce((a, d) => a + d.servers, 0)
  return (
    <div className={'panel col ' + (m.releasedByPlayer ? 'is-live' : 'is-off')}>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <div><h3>{m.name} <span className={'tag ' + (m.releasedByPlayer ? 'live' : 'off')}>{m.releasedByPlayer ? 'Live' : 'Not on market'}</span></h3>
          <div className="dim mono" style={{ fontSize: 12 }}>{MODALITIES[m.modality ?? 'text'].name} · {num(m.paramsB)}B · loss {m.loss.toFixed(3)} · Elo {Math.round(m.elo)} · post-train {m.posttrain}/3{m.method && m.method !== 'scratch' ? ` · ${m.method}${m.baseName ? ` of ${m.baseName}` : ''}` : ''}</div></div>
        <div className="row">
          {m.releasedByPlayer && <button className="btn sm" title="Take this model and its products off the market" onClick={() => void confirmAct('Withdraw ' + m.name, PV.previewWithdraw(w, m.name, w.products.filter((p) => p.modelId === id).length), 'Withdraw', (x) => A.withdrawModel(x, id), { okMsg: m.name + ' withdrawn' })}>Withdraw from market</button>}
          <button className="btn sm" onClick={() => act((x) => A.postTrain(x, id), 'Post-training done: +45 Elo')} disabled={m.posttrain >= 3}>Post-train (+45 Elo)</button>
        </div>
      </div>
      {!m.releasedByPlayer ? (
        <div className="row"><Field label="API price ($ per Mtok)"><Num value={price} step={0.1} min={0.01} onChange={setPrice} /></Field><button className="btn pri" onClick={() => act((x) => A.launchModel(x, id, price))}>Launch model</button></div>
      ) : (
        <>
          <div className="grid" style={{ gridTemplateColumns: 'repeat(5,1fr)' }}>
            {[['Market share', (m.share * 100).toFixed(2) + '%'], ['Demand', num(m.demandTokPerDay) + ' tok/d'], ['Capacity', num(m.capacityTokPerDay) + ' tok/d'], ['Served', num(m.tokensServed) + ' tok'], ['Lifetime revenue', money(m.revenue)]].map(([k, v]) => <div key={k} className="panel flat"><div className="dim mono" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.1em' }}>{k}</div><div className="mono" style={{ fontWeight: 600 }}>{v}</div></div>)}
          </div>
          <div className="row wrap">
            <Field label="Price $/Mtok"><Num value={m.priceMtok} step={0.1} min={0.01} onChange={(p) => act((x) => A.setModelPrice(x, id, p))} /></Field>
            <Field label="Compute"><Select value={siteId} onChange={(e) => setSite(e.target.value)}>{w.sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}<option value={CLOUD}>☁ Amazoon cloud{gid ? ` · ${money(cloudRate(w, gpu(w, gid)) * 8)}/server·h` : ''}</option></Select></Field>
            <Field label="GPU"><Select value={gid} onChange={(e) => setGpu(e.target.value)}>{gpuIds.map((i) => <option key={i} value={i}>{gpu(w, i).name}</option>)}</Select></Field>
            <Field label={`Serve on ${servers}/${free + (deps.find((d) => d.siteId === siteId && d.gpuId === gid)?.servers ?? 0)} servers`}><input type="range" min={0} max={Math.max(1, free + (deps.find((d) => d.siteId === siteId && d.gpuId === gid)?.servers ?? 0))} value={servers} onChange={(e) => setServers(+e.target.value)} /></Field>
            <button className="btn pri" style={{ alignSelf: 'end' }} onClick={() => act((x) => A.deployModel(x, id, siteId, gid, servers), 'Deployment updated')}>Deploy</button>
          </div>
          <div className="dim" style={{ fontSize: 12 }}>{existing} servers serving: {deps.map((d) => `${d.servers}×${gpu(w, d.gpuId).name}@${d.siteId === CLOUD ? 'cloud' : w.sites.find((s) => s.id === d.siteId)?.name}`).join(', ') || 'none — you are earning nothing'}</div>
        </>
      )}
    </div>
  )
}
