import { useState } from 'react'
import * as A from '@sim/actions'
import { GPUS_PER_SERVER } from '@sim/data/hardware'
import { eloFromLoss, goodput, modelLoss, referencePrice, serveMemoryGB, serveTokPerSecPerServer, trainFlops, trainMemoryGB, trainingMfu } from '@sim/ai'
import { committed, gpu, hallServers, hasTech, worstFabric } from '@sim/util'
import { dateOf, dur, flops, money, num } from '../format'
import { useGame, useWorld } from '../store'
import { Bar, Field, Head, Num, Tabs } from '../ui'

const TABS = ['train', 'runs', 'models'] as const

export function Lab() {
  const w = useWorld()
  const [tab, setTab] = useState<(typeof TABS)[number]>(w.runs.some((r) => r.status === 'running') ? 'runs' : 'train')
  return (
    <>
      <Head title="Research Lab" sub="Pick a model size and token budget, then burn FLOPs. Scaling laws are unforgiving: more parameters need more data, more data needs more GPU-months." />
      <Tabs tabs={TABS} value={tab} onChange={setTab} />
      {tab === 'train' && <Train onStart={() => setTab('runs')} />}
      {tab === 'runs' && <Runs />}
      {tab === 'models' && <Models />}
    </>
  )
}

function Train({ onStart }: { onStart: () => void }) {
  const w = useWorld(); const act = useGame((s) => s.act)
  const [name, setName] = useState(() => A.randomModelName(w) + '-1')
  const [paramsB, setParams] = useState(7)
  const [tokensT, setTokens] = useState(2)
  const [moe, setMoe] = useState(false)
  const [dq, setDq] = useState(1)
  const [siteId, setSite] = useState(w.sites[0]?.id ?? '')
  const site = w.sites.find((s) => s.id === siteId)
  const gpuIds = site ? [...new Set(site.halls.flatMap((h) => h.racks.map((r) => r.gpuId).filter(Boolean)))] : []
  const [gpuId, setGpu] = useState(gpuIds[0] ?? '')
  const gid = gpuIds.includes(gpuId) ? gpuId : gpuIds[0] ?? ''
  const total = site && gid ? site.halls.reduce((a, h) => a + hallServers(h, gid), 0) : 0
  const free = site && gid ? total - committed(w, siteId, gid) : 0
  const [servers, setServers] = useState(16)
  const n = Math.max(1, Math.min(servers, Math.max(1, free)))
  const active = moe ? paramsB / 8 : paramsB
  const g = gid ? gpu(w, gid) : null
  const dqEff = Math.min(1.4, dq + (hasTech(w, 'synth') ? 0.15 : 0))
  const loss = modelLoss(paramsB, active, tokensT, moe, dqEff)
  const elo = eloFromLoss(loss) + (hasTech(w, 'distill') && paramsB <= 70 ? 60 : 0)
  const F = trainFlops(active, tokensT)
  const mfu = site && gid ? trainingMfu(w, n, worstFabric(site, gid)) : 0
  const rate = g ? n * GPUS_PER_SERVER * g.tflops * 1e12 * mfu * goodput(w, n, g) : 0
  const secs = rate > 0 ? F / rate : Infinity
  const mem = trainMemoryGB(paramsB), have = g ? 0.75 * n * GPUS_PER_SERVER * g.memGB : 0
  const err = site && g ? A.validateTraining(w, { name, paramsB, tokensT, moe, siteId, gpuId: gid, servers: n }) : 'Build a site and install servers first'
  const best = Math.max(...w.competitors.map((c) => c.elo))
  return (
    <div className="row" style={{ alignItems: 'flex-start', gap: 28 }}>
      <div className="panel col" style={{ flex: 1.1 }}>
        <Field label="Model name"><input type="text" value={name} onChange={(e) => setName(e.target.value)} /></Field>
        <div className="row">
          <Field label="Parameters (billions)"><Num value={paramsB} min={0.1} step={paramsB < 10 ? 1 : 10} onChange={setParams} /></Field>
          <Field label="Training tokens (trillions)"><Num value={tokensT} min={0.01} step={0.5} onChange={setTokens} /></Field>
        </div>
        <div className="row">
          <button className="btn sm" onClick={() => { setParams(7); setTokens(2) }}>7B · 2T</button>
          <button className="btn sm" onClick={() => { setParams(70); setTokens(15) }}>70B · 15T</button>
          <button className="btn sm" onClick={() => { setParams(405); setTokens(15) }}>405B · 15T</button>
          <button className="btn sm" onClick={() => { setParams(2000); setTokens(40) }}>2T · 40T</button>
        </div>
        <div className="row">
          <Field label={`Data quality ×${dq.toFixed(2)}${hasTech(w, 'synth') ? ' (+0.15 synthetic)' : ''}`}><input type="range" min={0.6} max={1.25} step={0.05} value={dq} onChange={(e) => setDq(+e.target.value)} /></Field>
          <label className="f" style={{ opacity: hasTech(w, 'moe') ? 1 : 0.4 }}>Mixture-of-Experts (8×)<input type="checkbox" checked={moe} disabled={!hasTech(w, 'moe')} onChange={(e) => setMoe(e.target.checked)} /></label>
        </div>
        <div className="row">
          <Field label="Site"><select value={siteId} onChange={(e) => setSite(e.target.value)}>{w.sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Field>
          <Field label="GPU"><select value={gid} onChange={(e) => setGpu(e.target.value)}>{gpuIds.map((id) => <option key={id} value={id}>{gpu(w, id).name}</option>)}</select></Field>
        </div>
        <Field label={`Servers: ${n} of ${free} free (${n * 8} GPUs)`}><input type="range" min={1} max={Math.max(1, free)} value={n} onChange={(e) => setServers(+e.target.value)} /></Field>
        <div className="row"><button className="btn pri" disabled={!!err} onClick={() => { const r = act((x) => A.startTraining(x, { name, paramsB, activeParamsB: active, tokensT, moe, dataQuality: dq, siteId, gpuId: gid, servers: n }), 'Training started'); if (r.ok) onStart() }}>Start training · data {money(tokensT * 1e6 * 20)}</button>{err && <span className="warn" style={{ fontSize: 12 }}>{err}</span>}</div>
      </div>
      <div className="panel col" style={{ flex: 1 }}>
        <h2>Forecast</h2>
        <table><tbody>
          <tr><td className="dim">Compute (6·N·D)</td><td className="r mono">{flops(F)}</td></tr>
          <tr><td className="dim">Tokens per parameter</td><td className="r mono">{((tokensT * 1000) / active).toFixed(1)} {Math.abs(tokensT * 1000 / active - 20) < 8 ? <span className="tag g">≈ compute-optimal</span> : null}</td></tr>
          <tr><td className="dim">Cluster MFU · goodput</td><td className="r mono">{(mfu * 100).toFixed(0)}% · {g ? (goodput(w, n, g) * 100).toFixed(0) : 0}%</td></tr>
          <tr><td className="dim">Wall-clock</td><td className="r mono">{dur(secs / 3600)}</td></tr>
          <tr><td className="dim">GPU memory needed / usable</td><td className="r mono" style={{ color: mem > have ? 'var(--red)' : undefined }}>{num(mem)} / {num(have)} GB</td></tr>
          <tr><td className="dim">Final loss</td><td className="r mono">{loss.toFixed(3)}</td></tr>
          <tr><td className="dim">Expected Elo</td><td className="r mono"><b>{Math.round(elo)}</b> <span className="dim">(SOTA {Math.round(best)})</span></td></tr>
          <tr><td className="dim">Serve memory</td><td className="r mono">{num(serveMemoryGB(paramsB))} GB</td></tr>
          <tr><td className="dim">Serve speed</td><td className="r mono">{g ? num(serveTokPerSecPerServer(w, g, active)) : 0} tok/s / server</td></tr>
          <tr><td className="dim">Suggested price</td><td className="r mono">${referencePrice(w.tick / 8766, elo).toFixed(2)} / Mtok</td></tr>
        </tbody></table>
      </div>
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
                <div className="dim" style={{ fontSize: 12 }}>{num(r.paramsB)}B{r.moe ? ' MoE' : ''} · {r.tokensT}T tokens · {r.servers * 8} × {gpu(w, r.gpuId).name} @ {site?.name} · started {dateOf(r.startTick)}</div></div>
              <div className="row">
                {r.status === 'running' && <button className="btn sm" onClick={() => act((x) => A.setRunStatus(x, r.id, 'paused'))}>Pause</button>}
                {r.status === 'paused' && <button className="btn sm" onClick={() => act((x) => A.setRunStatus(x, r.id, 'running'))}>Resume</button>}
                {(r.status === 'running' || r.status === 'paused') && <button className="btn sm danger" onClick={() => act((x) => A.setRunStatus(x, r.id, 'failed'), 'Run aborted')}>Abort</button>}
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
  const [siteId, setSite] = useState(w.sites[0]?.id ?? '')
  const site = w.sites.find((s) => s.id === siteId)
  const gpuIds = site ? [...new Set(site.halls.flatMap((h) => h.racks.map((r) => r.gpuId).filter(Boolean)))] : []
  const [gpuId, setGpu] = useState(gpuIds[0] ?? '')
  const gid = gpuIds.includes(gpuId) ? gpuId : gpuIds[0] ?? ''
  const free = site && gid ? site.halls.reduce((a, h) => a + hallServers(h, gid), 0) - committed(w, siteId, gid) : 0
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
            <Field label="Site"><select value={siteId} onChange={(e) => setSite(e.target.value)}>{w.sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Field>
            <Field label="GPU"><select value={gid} onChange={(e) => setGpu(e.target.value)}>{gpuIds.map((i) => <option key={i} value={i}>{gpu(w, i).name}</option>)}</select></Field>
            <Field label={`Serve on ${servers}/${free + (deps.find((d) => d.siteId === siteId && d.gpuId === gid)?.servers ?? 0)} servers`}><input type="range" min={0} max={Math.max(1, free + (deps.find((d) => d.siteId === siteId && d.gpuId === gid)?.servers ?? 0))} value={servers} onChange={(e) => setServers(+e.target.value)} /></Field>
            <button className="btn pri" style={{ alignSelf: 'end' }} onClick={() => act((x) => A.deployModel(x, id, siteId, gid, servers), 'Deployment updated')}>Deploy</button>
          </div>
          <div className="dim" style={{ fontSize: 12 }}>{existing} servers serving: {deps.map((d) => `${d.servers}×${gpu(w, d.gpuId).name}@${w.sites.find((s) => s.id === d.siteId)?.name}`).join(', ') || 'none — you are earning nothing'}</div>
        </>
      )}
    </div>
  )
}
