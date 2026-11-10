import { useState } from 'react'
import * as A from '@sim/actions'
import { GPUS_PER_SERVER } from '@sim/data/hardware'
import { eloFromLoss, goodput, modelLoss, referencePrice, trainFlops, trainMemoryGB, trainingMfu } from '@sim/ai'
import { DATASETS, EVALS, RIVAL_MIX, TEMPLATES, archLossDelta, archStats, evalScore, type ArchSpec } from '@sim/models'
import { NetFlow, type NetNode } from '../art/NetFlow'
import { CLOUD, cloudCapacity, cloudGpus, cloudRate } from '@sim/cloud'
import { CorpLogo } from '../art/Logos'
import { committed, gpu, hallServers, hasTech, techLevel, techSum, worstFabric, yearOf } from '@sim/util'
import { dateOf, dur, flops, money, num, params } from '../format'
import { useGame, useWorld } from '../store'
import { Bar, Field, Num, Summary, Tabs, Term } from '../ui'
import * as PV from '@sim/preview'
import * as Sum from '../summaries'

const TABS = ['design', 'data', 'runs', 'models', 'evals'] as const

export function Lab() {
  const w = useWorld()
  const [tab, setTab] = useState<(typeof TABS)[number]>(w.runs.some((r) => r.status === 'running') ? 'runs' : 'design')
  return (
    <>
      <div className="page-head"><div><div className="eyebrow">Research lab</div><h1>Design a mind</h1></div><Tabs tabs={TABS} value={tab} onChange={setTab} /></div>
      <Summary items={Sum.labSummary(w)} />
      {tab === 'design' && <Design onStart={() => setTab('runs')} onData={() => setTab('data')} />}
      {tab === 'data' && <DataMarket />}
      {tab === 'runs' && <Runs />}
      {tab === 'models' && <Models />}
      {tab === 'evals' && <Evals />}
    </>
  )
}

function Design({ onStart, onData }: { onStart: () => void; onData: () => void }) {
  const w = useWorld(); const act = useGame((s) => s.act)
  const [tpl, setTpl] = useState('llamma8')
  const [arch, setArch] = useState<ArchSpec>(() => ({ ...TEMPLATES.find((t) => t.id === 'llamma8')!.arch }))
  const [sel, setSel] = useState<NetNode | null>('block')
  const [name, setName] = useState(() => A.randomModelName(w) + '-1')
  const owned = DATASETS.filter((d) => (w.datasets[d.id] ?? 0) > 0)
  const [mix, setMix] = useState<Record<string, number>>(() => Object.fromEntries(owned.map((d) => [d.id, Math.min(d.tokensT, 2)])))
  const [siteId, setSite] = useState(w.sites.find((s) => s.halls.some((h) => h.racks.some((r) => r.servers > 0)))?.id ?? CLOUD)
  const cloud = siteId === CLOUD
  const site = w.sites.find((s) => s.id === siteId)
  const gpuIds = cloud ? cloudGpus(w).map((g) => g.id) : site ? [...new Set(site.halls.flatMap((h) => h.racks.map((r) => r.gpuId).filter(Boolean)))] : []
  const [gpuId, setGpu] = useState('')
  const gid = gpuIds.includes(gpuId) ? gpuId : gpuIds[gpuIds.length - 1] ?? ''
  const free = cloud && gid ? cloudCapacity(w, gid) : site && gid ? site.halls.reduce((acc, h) => acc + hallServers(h, gid), 0) - committed(w, siteId, gid) : 0
  const [servers, setServers] = useState(16)
  const n = Math.max(1, Math.min(servers, Math.max(1, free)))
  const up = (p: Partial<ArchSpec>): void => { setArch((x) => ({ ...x, ...p })); setTpl('custom') }
  const st = archStats(arch)
  const m = A.mixSummary(w, mix)
  const loss = modelLoss(st.totalB, st.activeB, Math.max(m.tokensT, 0.001), arch.experts > 1, m.quality || 1) + archLossDelta(arch)
  const elo = eloFromLoss(loss) + techSum(w, 'elo')
  const F = trainFlops(st.activeB, m.tokensT)
  const g = gid ? gpu(w, gid) : null
  const mfu = (site || cloud) && gid ? trainingMfu(w, n, cloud ? 'ib400' : worstFabric(site!, gid)) : 0
  const bill = cloud && g ? cloudRate(w, g) * n * 8 : 0
  const rate = g ? n * 8 * g.tflops * 1e12 * mfu * goodput(w, n, g) : 0
  const memNeed = trainMemoryGB(st.totalB), memHave = g ? 0.75 * n * 8 * g.memGB : 0
  const evals = EVALS.map((e) => ({ e, v: evalScore(e, elo, m.tokensT ? m.shares : RIVAL_MIX, techLevel(w, 'reasoning')) }))
  const field = (label: string, v: number, min: number, max: number, step: number, k: keyof ArchSpec, log = false) => (
    <Field label={`${label}: ${num(v)}`}><input type="range" min={log ? Math.log2(min) : min} max={log ? Math.log2(max) : max} step={log ? 0.01 : step} value={log ? Math.log2(v) : v}
      onChange={(ev) => { let x = +ev.target.value; if (log) x = Math.round(2 ** x / step) * step; up({ [k]: x } as Partial<ArchSpec>) }} /></Field>)
  return (
    <div className="col" style={{ gap: 16 }}>
      <div className="row" style={{ gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
        {TEMPLATES.map((t) => { const s2 = archStats(t.arch); return (
          <button key={t.id} className={'adv' + (tpl === t.id ? ' on' : '')} style={{ gridTemplateColumns: '30px 1fr', minWidth: 200 }} onClick={() => { setTpl(t.id); setArch({ ...t.arch }); setName(t.name.replace(/[^A-Za-z0-9]+/g, '-') + '-remix') }}>
            <span>{t.corp ? <CorpLogo id={t.corp} size={28} /> : <span style={{ fontSize: 20 }}>🌌</span>}</span>
            <span><b>{t.name}</b><br /><span>{params(s2.totalB)}{t.arch.experts > 1 ? ` · ${params(s2.activeB)} active` : ''}</span></span>
          </button>) })}
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
      <div className="panel col" style={{ gap: 12 }}>
        <div className="row" style={{ justifyContent: 'space-between' }}><h3>Training data mix</h3><button className="btn sm ghost" onClick={onData}>Dataset market</button></div>
        {owned.length === 0 ? <p className="dim">You own no data. Grab the free web crawl in the dataset market — or something less legal.</p> :
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>{owned.map((d) => (
            <Field key={d.id} label={`${d.name} · ${(mix[d.id] ?? 0).toFixed(2)}T of ${d.tokensT}T${(mix[d.id] ?? 0) > d.tokensT ? ` · ${((mix[d.id] ?? 0) / d.tokensT).toFixed(1)} epochs` : ''}`}>
              <input type="range" min={0} max={d.tokensT * 4} step={d.tokensT / 100} value={mix[d.id] ?? 0} onChange={(ev) => setMix({ ...mix, [d.id]: +ev.target.value })} /></Field>))}</div>}
        <div className="dim" style={{ fontSize: 12.5 }}>{m.tokensT.toFixed(2)}T tokens · quality ×{(m.quality || 0).toFixed(2)} · {((m.tokensT * 1000) / Math.max(st.activeB, 1e-9)).toFixed(0)} tokens/param (Chinchilla ≈ 20){m.error ? ` · ${m.error}` : ''}</div>
      </div>
      <div className="panel row wrap" style={{ gap: 14, alignItems: 'end' }}>
        <Field label="Model name"><input type="text" value={name} onChange={(e) => setName(e.target.value)} /></Field>
        <Field label="Compute"><select value={siteId} onChange={(e) => setSite(e.target.value)}>{w.sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}<option value={CLOUD}>☁ Rent from Amazoon cloud</option></select></Field>
        <Field label="GPU"><select value={gid} onChange={(e) => setGpu(e.target.value)}>{gpuIds.map((id) => <option key={id} value={id}>{gpu(w, id).name}</option>)}</select></Field>
        <Field label={`Servers ${n}/${free} · ${num(n * 8)} GPUs`}><input type="range" min={1} max={Math.max(1, free)} value={n} onChange={(e) => setServers(+e.target.value)} /></Field>
        <div className="dim" style={{ fontSize: 12.5 }}><Term k="mfu">MFU</Term> {(mfu * 100).toFixed(0)}% · ETA {dur(rate > 0 ? F / rate / 3600 : Infinity)}{cloud ? ` · ${money(bill)}/h ≈ ${money(bill * (rate > 0 ? F / rate / 3600 : 0))} total` : ''}<br /><span style={{ color: memNeed > memHave ? 'var(--red)' : undefined }}>memory {num(memNeed)} / {num(memHave)} GB</span></div>
        <button className="btn pri" onClick={() => { void useGame.getState().confirmAct(`Start training ${name}?`, PV.previewTraining(w, cloud ? bill * (rate > 0 ? F / rate / 3600 : 0) : 0), 'Train', (x) => A.startArchTraining(x, { name, arch, mix, siteId, gpuId: gid, servers: n }), { okMsg: 'Training started' }).then((r) => { if (r?.ok) onStart() }) }}>Start training</button>
      </div>
    </div>
  )
}

function DataMarket() {
  const w = useWorld(); const act = useGame((s) => s.act)
  return (
    <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))', gap: 12 }}>
      {DATASETS.map((d) => { const own = (w.datasets[d.id] ?? 0) > 0; const locked = (d.needsTech && !hasTech(w, d.needsTech)) || d.year > yearOf(w.tick) + 0.5; return (
        <div key={d.id} className="panel lift col" style={{ gap: 8, opacity: locked ? 0.5 : 1 }}>
          <div className="row" style={{ justifyContent: 'space-between' }}><span className="tag b">{d.domain}</span>{d.legalRisk > 0.4 ? <span className="tag r">legal risk {(d.legalRisk * 100).toFixed(0)}%</span> : d.legalRisk > 0.1 ? <span className="tag a">some risk</span> : <span className="tag g">clean</span>}</div>
          <h3>{d.name}</h3><div className="dim" style={{ fontSize: 12.5 }}>{d.source}</div>
          <div className="row" style={{ gap: 18, fontSize: 13 }}><span><b>{num(d.tokensT)}T</b> tokens</span><span>quality <b>×{d.quality}</b></span></div>
          <button className={'btn sm ' + (own ? 'ghost' : 'pri')} disabled={own || !!locked} onClick={() => void useGame.getState().confirmAct(`Buy ${d.name}?`, PV.previewSpend(w, d.usd), 'Buy', (x) => A.buyDataset(x, d.id))}>{own ? 'Owned' : locked ? 'Locked' : d.usd === 0 ? 'Download free' : `Buy · ${money(d.usd)}`}</button>
        </div>) })}
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
              <div><h3>{r.name} <span className={'tag ' + (r.status === 'running' ? 'g' : r.status === 'done' ? '' : 'a')}>{r.status}</span> {r.owner !== 'player' && <span className="tag a">contract</span>}</h3>
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
  if (!w.models.length) return <p className="dim">Finish a training run to get your first model.</p>
  return (
    <div className="col" style={{ gap: 14 }}>
      {w.models.map((m) => <ModelCard key={m.id} id={m.id} />)}
      <p className="dim" style={{ fontSize: 12 }}>{act.length ? '' : ''}Demand is split by a quality-vs-price softmax across every model on the leaderboard. Capacity short? You lose the surplus and your reputation takes a hit.</p>
    </div>
  )
}

function ModelCard({ id }: { id: string }) {
  const w = useWorld(); const act = useGame((s) => s.act)
  const m = w.models.find((x) => x.id === id)!
  const deps = w.deployments.filter((d) => d.modelId === id)
  const [siteId, setSite] = useState(w.sites[0]?.id ?? CLOUD)
  const cloud = siteId === CLOUD
  const site = w.sites.find((s) => s.id === siteId)
  const gpuIds = cloud ? cloudGpus(w).map((g) => g.id) : site ? [...new Set(site.halls.flatMap((h) => h.racks.map((r) => r.gpuId).filter(Boolean)))] : []
  const [gpuId, setGpu] = useState(gpuIds[0] ?? '')
  const gid = gpuIds.includes(gpuId) ? gpuId : gpuIds[gpuIds.length - 1] ?? ''
  const free = cloud && gid ? cloudCapacity(w, gid) : site && gid ? site.halls.reduce((a, h) => a + hallServers(h, gid), 0) - committed(w, siteId, gid) : 0
  const [servers, setServers] = useState(8)
  const [price, setPrice] = useState(() => +referencePrice(w.tick / 8766, m.elo).toFixed(2))
  const existing = deps.reduce((a, d) => a + d.servers, 0)
  return (
    <div className="panel col">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <div><h3>{m.name} <span className={'tag ' + (m.releasedByPlayer ? 'g' : 'a')}>{m.releasedByPlayer ? 'live' : 'unreleased'}</span></h3>
          <div className="dim mono" style={{ fontSize: 12 }}>{num(m.paramsB)}B · loss {m.loss.toFixed(3)} · Elo {Math.round(m.elo)} · post-train {m.posttrain}/3</div></div>
        <div className="row">
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
            <Field label="Compute"><select value={siteId} onChange={(e) => setSite(e.target.value)}>{w.sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}<option value={CLOUD}>☁ Amazoon cloud{gid ? ` · ${money(cloudRate(w, gpu(w, gid)) * 8)}/server·h` : ''}</option></select></Field>
            <Field label="GPU"><select value={gid} onChange={(e) => setGpu(e.target.value)}>{gpuIds.map((i) => <option key={i} value={i}>{gpu(w, i).name}</option>)}</select></Field>
            <Field label={`Serve on ${servers}/${free + (deps.find((d) => d.siteId === siteId && d.gpuId === gid)?.servers ?? 0)} servers`}><input type="range" min={0} max={Math.max(1, free + (deps.find((d) => d.siteId === siteId && d.gpuId === gid)?.servers ?? 0))} value={servers} onChange={(e) => setServers(+e.target.value)} /></Field>
            <button className="btn pri" style={{ alignSelf: 'end' }} onClick={() => act((x) => A.deployModel(x, id, siteId, gid, servers), 'Deployment updated')}>Deploy</button>
          </div>
          <div className="dim" style={{ fontSize: 12 }}>{existing} servers serving: {deps.map((d) => `${d.servers}×${gpu(w, d.gpuId).name}@${d.siteId === CLOUD ? 'cloud' : w.sites.find((s) => s.id === d.siteId)?.name}`).join(', ') || 'none — you are earning nothing'}</div>
        </>
      )}
    </div>
  )
}
