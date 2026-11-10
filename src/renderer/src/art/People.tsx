/** Procedural flat-illustration portraits. Same seed → same person. */
const SKIN = ['#f6d7c3', '#eac0a2', '#d9a27e', '#b97c55', '#8d5a3b', '#5e3b26']
const HAIR = ['#1f1a17', '#3b2a20', '#6b4a2e', '#a8783f', '#d9b36c', '#8f8f94', '#c2462f', '#2b2f4a']
const SHIRT = ['oklch(0.58 0.16 255)', 'oklch(0.6 0.17 155)', 'oklch(0.7 0.15 65)', 'oklch(0.58 0.18 295)', 'oklch(0.3 0.03 265)', 'oklch(0.6 0.2 25)', 'oklch(0.75 0.03 250)']
const BG = ['oklch(0.92 0.04 255)', 'oklch(0.93 0.05 155)', 'oklch(0.94 0.05 75)', 'oklch(0.93 0.04 300)', 'oklch(0.93 0.03 20)', 'oklch(0.93 0.01 250)']

function hash(s: string): number { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) } return h >>> 0 }
const pickN = (h: number, n: number, salt: number): number => (((h >>> (salt % 24)) ^ Math.imul(h, salt * 2654435761)) >>> 0) % n

export function Portrait({ seed, size = 52, jacket = false }: { seed: string; size?: number; jacket?: boolean }) {
  const h = hash(seed)
  const skin = SKIN[pickN(h, SKIN.length, 1)], hair = HAIR[pickN(h, HAIR.length, 3)]
  const shirt = jacket ? '#1d1d1f' : SHIRT[pickN(h, SHIRT.length, 5)], bg = BG[pickN(h, BG.length, 7)]
  const style = pickN(h, 6, 9), glasses = pickN(h, 4, 11) === 0, beard = pickN(h, 5, 13) === 0, smile = pickN(h, 3, 17)
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden style={{ display: 'block' }}>
      <rect width={64} height={64} fill={bg} />
      {style === 4 && <path d="M14 30 q-2 22 6 30 h24 q8 -8 6 -30z" fill={hair} />}
      <path d="M10 64 q2 -16 22 -16 q20 0 22 16z" fill={shirt} />
      {jacket && <path d="M26 50 l6 8 6 -8" fill="none" stroke="#3a3a3c" strokeWidth={2} />}
      <rect x={27} y={40} width={10} height={9} rx={3} fill={skin} />
      <ellipse cx={32} cy={30} rx={12} ry={14} fill={skin} />
      {style === 0 && <path d="M19 28 q1 -14 13 -14 q12 0 13 14 q-4 -7 -13 -7 q-8 0 -13 7z" fill={hair} />}
      {style === 1 && <path d="M19 30 q-1 -17 14 -16 q13 1 12 16 l-3 -6 q-8 -6 -21 0z" fill={hair} />}
      {style === 2 && <path d="M20 24 q12 -14 24 0 q-12 -4 -24 0z" fill={hair} />}
      {style === 3 && <><path d="M18 30 q0 -17 14 -17 q14 0 14 17 v8 q-3 -12 -3 -16 q-10 4 -22 0 q0 4 -3 16z" fill={hair} /></>}
      {style === 4 && <path d="M19 29 q0 -16 13 -16 q13 0 13 16 q-6 -9 -13 -9 q-7 0 -13 9z" fill={hair} />}
      {style === 5 && <circle cx={32} cy={14} r={6} fill={hair} />}
      {style === 5 && <path d="M20 26 q12 -12 24 0 q-12 -5 -24 0z" fill={hair} />}
      <circle cx={27} cy={31} r={1.4} fill="#1f1a17" /><circle cx={37} cy={31} r={1.4} fill="#1f1a17" />
      <path d={`M24.5 27.5 q2.5 -1.5 5 0 M34.5 27.5 q2.5 -1.5 5 0`} stroke={hair} strokeWidth={1.1} fill="none" strokeLinecap="round" />
      {glasses && <g fill="none" stroke="#2b2b2e" strokeWidth={1.1}><circle cx={27} cy={31} r={4} /><circle cx={37} cy={31} r={4} /><path d="M31 31 h2" /></g>}
      {beard && <path d="M21 33 q1 12 11 12 q10 0 11 -12 q-2 6 -11 6 q-9 0 -11 -6z" fill={hair} opacity={0.9} />}
      <path d={smile === 0 ? 'M28.5 38 q3.5 3 7 0' : smile === 1 ? 'M29 38.5 h6' : 'M28 37.5 q4 4.5 8 0'} stroke="#7a3b2e" strokeWidth={1.3} fill="none" strokeLinecap="round" />
    </svg>
  )
}
