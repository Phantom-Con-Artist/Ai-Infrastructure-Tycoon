import React from 'react';
import { Composition } from 'remotion';
import { REEL_FRAMES, Reel, SYSTEMS, SYSTEM_FRAMES, SystemClip } from './clips';

export const Root: React.FC = () => (
  <>
    <Composition id="reel" component={Reel} width={1280} height={720} fps={30} durationInFrames={REEL_FRAMES} />
    {SYSTEMS.map((s) => <Composition key={s.id} id={s.id} component={SystemClip} defaultProps={{ spec: s }} width={1280} height={800} fps={30} durationInFrames={SYSTEM_FRAMES} />)}
  </>
);
