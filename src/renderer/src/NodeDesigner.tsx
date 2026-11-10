/** Node studio: configure your own 8-GPU server around any accelerator on sale and see the trade-offs live. */
import { useState } from 'react'
import { Cpu, Droplets, Gauge, MemoryStick, ShieldCheck, Wrench } from 'lucide-react'
import { gpuCatalog, serverPeakKw } from '@sim/data/hardware'
import { DESIGN_FEE, designNode, nodeSpec, type NodeOpts } from '@sim/nodes'
import { serverMarketPrice } from '@sim/market'
import { yearOf } from '@sim/util'
import * as PV from '@sim/preview'
import { useGame, useWorld } from './store'
import { money, num } from './format'
import { GpuArt } from './art/Brand'

function Seg<T extends string | number>({ value, options, onChange }: { value: T; options: [T, string][]; onChange: (v: T) => void }) {
  return <div className="seg">{options.map(([v, l]) => <button key={String(v)} className={v === value ? 'on' : ''} onClick={() => onChange(v)}>{l}</button>)}</div>
}

export function NodeDesigner() {
  const w = useWorld()
  const bases = gpuCatalog(yearOf(w.tick)).filter((g) => !g.vcpus).sort((a, b) => b.tflops - a.tflops)
  const [baseId, setBase] = useState(bases[0]?.id ?? '')
  const [o, setO] = useState<NodeOpts>({ cooling: 'air', power: 'balanced', ramTB: 2, parts: 'standard' })
  const [name, setName] = useState(`${w.company.split(' ')[0]} N${w.customGpus.filter((g) => g.node).length + 1}`)
  const base = bases.find((g) => g.id === baseId) ?? bases[0]
  if (!base) return null
  const ref = nodeSpec(base, { cooling: 'air', power: 'balanced', ramTB: 2, parts: 'standard' })
  const s = nodeSpec(base, o, 'preview', name)
  const set = (p: Partial<NodeOpts>): void => setO({ ...o, ...p })
  const rows: [string, number, number, (v: number) => string, boolean][] = [
    ['TFLOPS / GPU', s.tflops, ref.tflops, (v) => num(v), true],
    ['Power / server', serverPeakKw(s), serverPeakKw(ref), (v) => `${v.toFixed(1)} kW`, false],
    ['Price / server', serverMarketPrice(w, s), serverMarketPrice(w, ref), (v) => money(v), false],
    ['TFLOPS per kW', (s.tflops * 8) / serverPeakKw(s), (ref.tflops * 8) / serverPeakKw(ref), (v) => num(Math.round(v)), true],
    ['MTBF / GPU', s.mtbfH, ref.mtbfH, (v) => `${num(Math.round(v / 1000))}k h`, true]
  ]
  return (
    <div className="node-studio">
      <div className="ns-stage" style={{ ['--vc' as string]: o.cooling === 'liquid' ? 'oklch(0.7 0.14 230)' : 'oklch(0.75 0.12 60)' }}>
        <div className={'ns-art ' + o.cooling}><GpuArt g={s} width={220} /></div>
        <input className="ns-name" value={name} onChange={(e) => setName(e.target.value)} aria-label="Design name" />
        <span className="dim" style={{ fontSize: 12 }}>8 × {base.name} · {o.cooling === 'liquid' ? 'needs a liquid-cooled hall' : 'fits any hall'}</span>
      </div>
      <div className="col" style={{ gap: 14 }}>
        <label className="ns-row"><span><Cpu size={15} /> Accelerator</span><select value={base.id} onChange={(e) => setBase(e.target.value)}>{bases.map((g) => <option key={g.id} value={g.id}>{g.name} · {num(g.tflops)} TF</option>)}</select></label>
        <div className="ns-row"><span><Droplets size={15} /> Cooling</span><Seg value={o.cooling} options={[['air', 'Air'], ['liquid', 'Cold plate']]} onChange={(v) => set({ cooling: v })} /></div>
        <div className="ns-row"><span><Gauge size={15} /> Power profile</span><Seg value={o.power} options={[['eco', 'Eco 75%'], ['balanced', 'Balanced'], ['max', 'Max 110%']]} onChange={(v) => set({ power: v })} /></div>
        <div className="ns-row"><span><MemoryStick size={15} /> Host RAM</span><Seg value={o.ramTB} options={[[1, '1 TB'], [2, '2 TB'], [4, '4 TB']]} onChange={(v) => set({ ramTB: v })} /></div>
        <div className="ns-row"><span><ShieldCheck size={15} /> Parts</span><Seg value={o.parts} options={[['standard', 'Standard'], ['premium', 'Premium']]} onChange={(v) => set({ parts: v })} /></div>
        <table className="ns-table"><tbody>{rows.map(([l, v, r, f, up]) => {
          const d = r ? v / r - 1 : 0, good = up ? d > 0.001 : d < -0.001, bad = up ? d < -0.001 : d > 0.001
          return <tr key={l}><td className="dim">{l}</td><td className="r"><b>{f(v)}</b></td><td className={'r ' + (good ? 'pos' : bad ? 'neg' : 'dim')} style={{ width: 70 }}>{Math.abs(d) < 0.001 ? '—' : `${d > 0 ? '+' : ''}${(d * 100).toFixed(0)}%`}</td></tr>
        })}</tbody></table>
        <button className="btn pri" style={{ justifyContent: 'center' }} onClick={() => void useGame.getState().confirmAct(`Engineer the ${name.trim() || 'new'} node?`, PV.previewSpend(w, DESIGN_FEE), 'Design it', (x) => designNode(x, name, base.id, o), { okMsg: 'Node designed — order it from the catalogue' })}>
          <Wrench size={15} /> Design it · {money(DESIGN_FEE)}</button>
      </div>
    </div>
  )
}
