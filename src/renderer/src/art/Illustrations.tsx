import type { ReactElement } from 'react'
import { IsoBox, IsoTile, P, iso } from './iso'
import './art.css'

const INK = 'oklch(0.24 0.025 265)'
const RACK = { top: 'oklch(0.42 0.03 265)', left: 'oklch(0.27 0.025 265)', right: 'oklch(0.33 0.028 265)' }
const WHITE = { top: 'oklch(0.995 0.002 250)', left: 'oklch(0.9 0.008 250)', right: 'oklch(0.95 0.005 250)' }
const GREEN = 'oklch(0.72 0.19 150)'

/** Racks in rows with blinking LEDs: used on the menu and HQ. */
export function HeroCampus({ className }: { className?: string }) {
  const racks: ReactElement[] = []
  let k = 0
  for (let row = 0; row < 4; row++) for (let i = 0; i < 7; i++) {
    const x = i * 9, y = row * 22
    racks.push(<g key={`r${row}${i}`}><IsoBox x={x} y={y} w={7} d={11} h={26} {...RACK} />
      {[0, 1, 2, 3].map((j) => { const [lx, ly] = iso(x + 1.5 + j * 1.3, y + 11, 6 + ((i + j + row) % 5) * 3.8); return <rect key={j} x={lx} y={ly} width={1.6} height={1.1} rx={0.4} fill={GREEN} className="blink" style={{ animationDelay: `${((k++ * 137) % 900) / 300}s` }} /> })}
    </g>)
  }
  const [px0, py0] = iso(-30, 40, 0), [px1, py1] = iso(-8, 40, 0), [px2, py2] = iso(-8, 0, 0)
  return (
    <svg className={className} viewBox="-150 -60 300 210" aria-hidden>
      <IsoTile x={-40} y={-10} w={120} d={110} fill="oklch(0.94 0.01 250)" stroke="oklch(0.3 0.02 260 / .1)" />
      <IsoTile x={-4} y={-6} w={70} d={96} fill="oklch(0.985 0.004 250)" />
      {/* substation */}
      <IsoBox x={-34} y={52} w={18} d={14} h={14} top="oklch(0.62 0.05 160)" left="oklch(0.48 0.05 160)" right="oklch(0.55 0.05 160)" />
      {/* power line with travelling current */}
      <path d={`M${P([px0, py0])} L${P([px1, py1])} L${P([px2, py2])}`} fill="none" stroke="oklch(0.3 0.02 260 / .25)" strokeWidth={1.2} />
      <path d={`M${P([px0, py0])} L${P([px1, py1])} L${P([px2, py2])}`} fill="none" stroke={GREEN} strokeWidth={1.4} strokeDasharray="4 10" className="flow" />
      {racks}
      {/* cooling towers */}
      {[0, 1].map((i) => <g key={i}><IsoBox x={70} y={i * 24} w={18} d={18} h={18} {...WHITE} />
        <ellipse cx={iso(79, i * 24 + 9, 18)[0]} cy={iso(79, i * 24 + 9, 18)[1]} rx={10} ry={5.5} fill="oklch(0.3 0.02 260 / .7)" />
        <g transform={`translate(${iso(79, i * 24 + 9, 18.4).join(',')}) scale(1 .55)`}><g className="spin"><path d="M0 0 L8 -2 L8 2 Z M0 0 L-8 2 L-8 -2 Z M0 0 L2 8 L-2 8 Z M0 0 L-2 -8 L2 -8 Z" fill="oklch(0.85 0.01 250)" /></g></g>
      </g>)}
      {/* steam */}
      {[0, 1, 2].map((i) => <circle key={i} cx={iso(79, 9, 30)[0] + i * 3} cy={iso(79, 9, 30)[1]} r={4 + i} fill="oklch(1 0 0 / .8)" className="steam" style={{ animationDelay: `${i * 0.9}s` }} />)}
    </svg>
  )
}

/** Empty land with survey stakes (no sites yet). */
export function EmptyLand() {
  return (
    <svg className="illo" viewBox="-110 -40 220 150" aria-hidden>
      <IsoTile x={-20} y={-20} w={100} d={80} fill="oklch(0.9 0.04 140)" />
      <IsoTile x={0} y={0} w={60} d={40} fill="none" stroke={INK} dash="3 3" />
      {[[0, 0], [60, 0], [60, 40], [0, 40]].map(([x, y], i) => { const [a, b] = iso(x, y, 0); return <g key={i} className="bob" style={{ animationDelay: `${i * .3}s` }}><line x1={a} y1={b} x2={a} y2={b - 16} stroke={INK} strokeWidth={1.2} /><path d={`M${a} ${b - 16} l9 3 -9 3z`} fill="oklch(0.65 0.2 30)" /></g> })}
      {[[-10, 50], [70, -12], [85, 30]].map(([x, y], i) => { const [a, b] = iso(x, y, 0); return <g key={i}><ellipse cx={a} cy={b} rx={5} ry={2.5} fill="oklch(0.3 0.05 140 / .2)" /><circle cx={a} cy={b - 8} r={6} fill="oklch(0.62 0.13 150)" /><rect x={a - .8} y={b - 4} width={1.6} height={4} fill="oklch(0.4 0.05 60)" /></g> })}
      <g className="bob"><path d={`M${P(iso(30, 20, 34))} l0 -10`} stroke={INK} strokeWidth={1} /><circle cx={iso(30, 20, 46)[0]} cy={iso(30, 20, 46)[1]} r={4} fill={GREEN} /></g>
    </svg>
  )
}

/** Blueprint floor of an empty hall with a ghost rack being dropped in. */
export function EmptyHallArt() {
  const lines: ReactElement[] = []
  for (let i = 0; i <= 10; i++) {
    lines.push(<line key={'a' + i} x1={iso(i * 8, 0)[0]} y1={iso(i * 8, 0)[1]} x2={iso(i * 8, 64)[0]} y2={iso(i * 8, 64)[1]} stroke="oklch(0.58 0.16 255 / .25)" strokeWidth={0.6} />)
    if (i <= 8) lines.push(<line key={'b' + i} x1={iso(0, i * 8)[0]} y1={iso(0, i * 8)[1]} x2={iso(80, i * 8)[0]} y2={iso(80, i * 8)[1]} stroke="oklch(0.58 0.16 255 / .25)" strokeWidth={0.6} />)
  }
  return (
    <svg className="illo" viewBox="-70 -50 150 120" aria-hidden>
      <IsoTile x={0} y={0} w={80} d={64} fill="oklch(0.58 0.16 255 / .06)" stroke="oklch(0.58 0.16 255 / .5)" />
      {lines}
      <IsoBox x={8} y={8} w={8} d={8} h={14} top="oklch(0.75 0.03 60)" left="oklch(0.6 0.03 60)" right="oklch(0.68 0.03 60)" />
      <IsoBox x={8} y={24} w={8} d={16} h={14} {...WHITE} />
      <g className="drop"><IsoBox x={32} y={24} w={8} d={8} h={20} top="oklch(0.58 0.16 255 / .25)" left="oklch(0.58 0.16 255 / .15)" right="oklch(0.58 0.16 255 / .2)" stroke="oklch(0.58 0.16 255)" /></g>
      <IsoTile x={32} y={24} w={8} d={8} fill="oklch(0.6 0.17 155 / .25)" stroke="oklch(0.6 0.17 155)" />
      <circle cx={iso(12, 12, 0)[0]} cy={iso(12, 12, 0)[1]} r={26} fill="none" stroke="oklch(0.7 0.15 65 / .6)" strokeDasharray="2 3" className="pulse" />
    </svg>
  )
}

/** A neural net glowing inside a flask (no models yet). */
export function EmptyLabArt() {
  const nodes = [[20, 70], [20, 95], [20, 120], [55, 60], [55, 85], [55, 110], [55, 135], [90, 80], [90, 115]]
  const edges: [number, number][] = []
  for (const a of [0, 1, 2]) for (const b of [3, 4, 5, 6]) edges.push([a, b])
  for (const a of [3, 4, 5, 6]) for (const b of [7, 8]) edges.push([a, b])
  return (
    <svg className="illo" viewBox="-20 0 150 170" aria-hidden>
      <path d="M38 8 h34 v38 l38 98 a14 14 0 0 1 -13 20 h-84 a14 14 0 0 1 -13 -20 l38 -98z" fill="oklch(0.58 0.16 255 / .06)" stroke={INK} strokeWidth={1.4} />
      <path d="M8 120 q50 -16 94 0 l10 26 a12 12 0 0 1 -11 17 h-82 a12 12 0 0 1 -11 -17z" fill="oklch(0.6 0.17 155 / .18)" />
      {edges.map(([a, b], i) => <line key={i} x1={nodes[a][0]} y1={nodes[a][1]} x2={nodes[b][0]} y2={nodes[b][1]} stroke="oklch(0.58 0.16 255 / .35)" strokeWidth={0.8} className="flow" strokeDasharray="2 4" style={{ animationDelay: `${i * .07}s` }} />)}
      {nodes.map(([x, y], i) => <circle key={i} cx={x} cy={y} r={4.2} fill="white" stroke={INK} strokeWidth={1.2} className="node" style={{ animationDelay: `${i * .18}s` }} />)}
      {[0, 1, 2].map((i) => <circle key={i} cx={40 + i * 14} cy={150} r={2 + i} fill="oklch(0.6 0.17 155 / .5)" className="steam" style={{ animationDelay: `${i * .7}s` }} />)}
    </svg>
  )
}

/** Signed paper + pen (no deals yet). */
export function EmptyDealsArt() {
  return (
    <svg className="illo" viewBox="0 0 160 130" aria-hidden>
      <g transform="rotate(-6 80 65)"><rect x={34} y={14} width={86} height={104} rx={6} fill="white" stroke={INK} strokeWidth={1.3} />
        {[30, 42, 54, 66].map((y, i) => <rect key={y} x={46} y={y} width={i === 3 ? 34 : 62} height={4} rx={2} fill="oklch(0.3 0.02 260 / .14)" />)}
        <path d="M48 98 q10 -14 18 0 t18 -2 t16 0" fill="none" stroke="oklch(0.58 0.16 255)" strokeWidth={1.6} className="sign" /></g>
      <g className="bob"><rect x={108} y={60} width={8} height={52} rx={3} transform="rotate(32 112 86)" fill={INK} /><path d="M121 104 l6 9 -9 -3z" fill="oklch(0.7 0.15 65)" /></g>
      <circle cx={130} cy={26} r={14} fill="oklch(0.6 0.17 155 / .15)" /><path d="M123 26 l5 5 9 -10" fill="none" stroke="oklch(0.6 0.17 155)" strokeWidth={2.4} strokeLinecap="round" className="sign" />
    </svg>
  )
}

/** Shipping crate + forklift for an empty fleet. */
export function EmptyFleetArt() {
  return (
    <svg className="illo" viewBox="-80 -50 160 120" aria-hidden>
      <IsoTile x={-30} y={-30} w={90} d={70} fill="oklch(0.94 0.01 250)" />
      <g className="drop"><IsoBox x={0} y={0} w={20} d={20} h={18} top="oklch(0.8 0.08 70)" left="oklch(0.65 0.08 65)" right="oklch(0.72 0.08 68)" /></g>
      <IsoBox x={24} y={0} w={20} d={20} h={18} top="oklch(0.8 0.08 70)" left="oklch(0.65 0.08 65)" right="oklch(0.72 0.08 68)" />
      <IsoBox x={0} y={24} w={20} d={20} h={9} {...RACK} />
      {[0, 1, 2, 3, 4].map((j) => { const [lx, ly] = iso(2 + j * 3.5, 44, 4); return <rect key={j} x={lx} y={ly} width={2} height={1.2} fill={GREEN} className="blink" style={{ animationDelay: `${j * .25}s` }} /> })}
      <text x={iso(10, 0, 9)[0] - 9} y={iso(10, 0, 9)[1] + 18} fontSize={5} fontWeight={700} fill="oklch(0.4 0.06 60)" transform="skewY(30)">FRAGILE</text>
    </svg>
  )
}
