import React from 'react';
import { AbsoluteFill, Sequence, interpolate, useCurrentFrame } from 'remotion';
import { Loop, Pan, Plate, Rise, fontFamily, type View } from './kit';

/* ---------- Reel: a slower walk through the game for the "Inside the machine" window ---------- */
const REEL: Array<[string, View, View, string]> = [
  ['hall', [1.25, 45, 62], [1.5, 55, 60], 'Lay out halls rack by rack'],
  ['fleet-cards', [1.15, 40, 55], [1.35, 55, 58], 'Buy, design and install servers'],
  ['lab-outlook', [1.15, 45, 50], [1.35, 40, 55], 'Train models and see what each choice buys'],
  ['research-tree', [1.1, 30, 40], [1.3, 55, 50], 'Research 154 technologies'],
  ['store', [1.1, 50, 40], [1.3, 45, 55], 'Ship products to millions of users'],
  ['society', [1.1, 50, 55], [1.3, 50, 70], 'Watch the world react'],
];
export const REEL_EACH = 66;
export const REEL_FRAMES = REEL.length * REEL_EACH;
const ReelShot: React.FC<{ name: string; from: View; to: View; text: string }> = ({ name, from, to, text }) => {
  const frame = useCurrentFrame();
  const o = interpolate(frame, [0, 8, REEL_EACH - 8, REEL_EACH], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <AbsoluteFill style={{ opacity: o }}>
      <Pan name={name} from={from} to={to} duration={REEL_EACH} />
      <div style={{ position: 'absolute', left: 40, top: 36, padding: '12px 22px', borderRadius: 999, background: '#000', color: '#fff', fontFamily, fontWeight: 500, fontSize: 22, letterSpacing: '-0.03em' }}>
        <Rise at={6} out={REEL_EACH - 16}>{text}</Rise>
      </div>
    </AbsoluteFill>
  );
};
export const Reel: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: '#f4f4f4' }}>
    {REEL.map(([name, from, to, text], i) => <Sequence key={name} from={i * REEL_EACH} durationInFrames={REEL_EACH}><ReelShot name={name} from={from} to={to} text={text} /></Sequence>)}
  </AbsoluteFill>
);

/* ---------- System clips: one screen, one figure that counts up ---------- */
export interface SystemSpec { id: string; shot: string; from: View; to: View; label: string; value: number; unit: string; note: string; fill: number; decimals?: number }
export const SYSTEMS: SystemSpec[] = [
  { id: 'sys-build', shot: 'hall', from: [1.05, 50, 55], to: [1.4, 42, 62], label: 'Build', value: 144, unit: 'racks in one hall', note: 'Place racks, power and cooling by hand. Roof strips show what is healthy, hot or dark.', fill: 0.8 },
  { id: 'sys-fleet', shot: 'fleet-cards', from: [1.05, 50, 50], to: [1.35, 30, 60], label: 'Fleet', value: 8, unit: 'GPUs per server', note: 'Order from parody vendors, or design your own node and your own chip.', fill: 0.5 },
  { id: 'sys-lab', shot: 'lab-outlook', from: [1.05, 50, 45], to: [1.3, 40, 52], label: 'Lab', value: 7, unit: 'kinds of model', note: 'Chat, coding, image, speech, music, video and omni. Each one is its own race.', fill: 0.64 },
  { id: 'sys-research', shot: 'research-tree', from: [1.05, 40, 40], to: [1.35, 60, 55], label: 'Research', value: 154, unit: 'technologies', note: 'Sixteen branches. Some levels never run out; the price just keeps climbing.', fill: 0.92 },
  { id: 'sys-store', shot: 'store', from: [1.05, 50, 40], to: [1.3, 40, 48], label: 'Store', value: 28.4, unit: 'million users', note: 'Plans, features, support and price experiments, all served from your own GPUs.', fill: 0.74, decimals: 1 },
  { id: 'sys-society', shot: 'society', from: [1.05, 50, 60], to: [1.3, 45, 75], label: 'Society', value: 4, unit: 'forces pushing back', note: 'Trust, regulation, internet slop and safety debt move because of what you do.', fill: 0.4 },
];
export const SYSTEM_FRAMES = 180;
export const SystemClip: React.FC<{ spec: SystemSpec }> = ({ spec }) => (
  <Loop><Pan name={spec.shot} from={spec.from} to={spec.to} /><Plate label={spec.label} value={spec.value} unit={spec.unit} note={spec.note} fill={spec.fill} decimals={spec.decimals} /></Loop>
);
