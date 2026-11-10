/**
 * Shared pieces for every clip. Black and white, one face (Poppins 500), the same
 * tight tracking and expo easing as the website, so the clips read as part of the page.
 */
import React from 'react';
import { AbsoluteFill, Easing, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { loadFont } from '@remotion/google-fonts/Poppins';

export const { fontFamily } = loadFont('normal', { weights: ['400', '500', '600'], subsets: ['latin'] });
export const expo = Easing.bezier(0.19, 1, 0.22, 1);
export const inOut = Easing.bezier(0.76, 0, 0.24, 1);
export const shot = (name: string): string => staticFile(`shots/${name}.jpg`);

/** A screenshot that drifts from one framing to another: [scale, x%, y%] of the focal point. */
export type View = [scale: number, x: number, y: number];
export const Pan: React.FC<{ name: string; from: View; to: View; start?: number; duration?: number; ease?: (t: number) => number }> = ({ name, from, to, start = 0, duration, ease = Easing.inOut(Easing.cubic) }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const t = interpolate(frame, [start, start + (duration ?? durationInFrames)], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease });
  const s = from[0] + (to[0] - from[0]) * t, x = from[1] + (to[1] - from[1]) * t, y = from[2] + (to[2] - from[2]) * t;
  return (
    <AbsoluteFill style={{ backgroundColor: '#f4f4f4', overflow: 'hidden' }}>
      <Img src={shot(name)} style={{ width: '100%', height: '100%', objectFit: 'cover', transformOrigin: `${x}% ${y}%`, transform: `scale(${s})` }} />
    </AbsoluteFill>
  );
};

/** A line of type that rises out of a mask, like the headings on the site. */
export const Rise: React.FC<{ children: React.ReactNode; at: number; style?: React.CSSProperties; out?: number }> = ({ children, at, style, out }) => {
  const frame = useCurrentFrame();
  const up = interpolate(frame, [at, at + 26], [110, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: expo });
  const down = out === undefined ? 0 : interpolate(frame, [out, out + 14], [0, -110], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: inOut });
  return <div style={{ overflow: 'hidden', paddingBottom: '0.12em', ...style }}><div style={{ transform: `translateY(${up + down}%)` }}>{children}</div></div>;
};

/** A number that counts up and settles. */
export const Count: React.FC<{ to: number; at: number; duration?: number; format?: (n: number) => string }> = ({ to, at, duration = 50, format = (n) => Math.round(n).toLocaleString('en-US') }) => {
  const frame = useCurrentFrame();
  const v = interpolate(frame, [at, at + duration], [0, to], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.exp) });
  return <>{format(v)}</>;
};

/** The black caption plate used on the system clips: a label, a counted figure and a bar that fills. */
export const Plate: React.FC<{ label: string; value: number; unit: string; note: string; at?: number; fill?: number; decimals?: number }> = ({ label, value, unit, note, at = 18, fill = 0.7, decimals = 0 }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const inn = interpolate(frame, [at, at + 28], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: expo });
  const out = interpolate(frame, [durationInFrames - 16, durationInFrames - 2], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const bar = interpolate(frame, [at + 14, at + 80], [0, fill], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: expo });
  return (
    <div style={{ position: 'absolute', left: 40, bottom: 40, width: 470, padding: '26px 30px 28px', borderRadius: 24, background: '#000', color: '#fff', fontFamily, fontWeight: 500, letterSpacing: '-0.0175em', opacity: inn * out, transform: `translateY(${(1 - inn) * 40}px)`, boxShadow: '0 30px 80px -30px rgb(0 0 0 / 0.55)' }}>
      <div style={{ fontSize: 17, color: '#bfbfbf' }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginTop: 6 }}>
        <span style={{ fontSize: 78, lineHeight: 1, letterSpacing: '-0.0575em', fontVariantNumeric: 'tabular-nums' }}><Count to={value} at={at + 6} format={(n) => n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })} /></span>
        <span style={{ fontSize: 24, color: '#bfbfbf', letterSpacing: '-0.03em' }}>{unit}</span>
      </div>
      <div style={{ height: 3, borderRadius: 99, background: '#2a2a2a', marginTop: 18, overflow: 'hidden' }}><div style={{ height: '100%', width: `${bar * 100}%`, background: '#fff', borderRadius: 99 }} /></div>
      <div style={{ fontSize: 17, lineHeight: 1.4, color: '#bfbfbf', marginTop: 14, fontWeight: 400, letterSpacing: 0 }}>{note}</div>
    </div>
  );
};

/** A soft fade at each end so the clip loops without a jump. */
export const Loop: React.FC<{ children: React.ReactNode; edge?: number }> = ({ children, edge = 10 }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const o = interpolate(frame, [0, edge, durationInFrames - edge, durationInFrames - 1], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return <AbsoluteFill style={{ backgroundColor: '#f4f4f4' }}><AbsoluteFill style={{ opacity: o }}>{children}</AbsoluteFill></AbsoluteFill>;
};
