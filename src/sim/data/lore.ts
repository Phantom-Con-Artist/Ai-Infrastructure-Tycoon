/** Fictional (parody) universe. Nothing here names a real trademark. */
export interface Corp { id: string; name: string; kind: 'lab' | 'chip' | 'cloud' | 'both'; ceo: string; quip: string; color: string }

export const CORPS: Corp[] = [
  { id: 'qooqle',    name: 'Qooqle',                kind: 'both', ceo: 'Sundae Pitchfork',   quip: 'Do the right thing, unless it is slower.', color: '#6ea8ff' },
  { id: 'nicosoft',  name: 'Nicosoft',              kind: 'both', ceo: 'Sadya Nutella',      quip: 'Bundles an AI with everything. Everything.', color: '#4dd2c2' },
  { id: 'ratthropic',name: 'Ratthropic',            kind: 'lab',  ceo: 'Dariyo Amodeus',     quip: 'Safety first. Also second. Also fundraising.', color: '#e0a26c' },
  { id: 'openaye',   name: 'OpenAye',               kind: 'lab',  ceo: "Sam Altmann't",      quip: 'Not open. Not sorry.', color: '#9cdc7a' },
  { id: 'meeta',     name: 'Meeta Platforms',       kind: 'lab',  ceo: 'Marc Zuckerbork',    quip: 'Weights are free. Servers are not.', color: '#7a8cff' },
  { id: 'exai',      name: 'Ex-AI',                 kind: 'lab',  ceo: 'Elan Muskrat',       quip: 'Maximally truth-seeking. Minimally on schedule.', color: '#d0d0d0' },
  { id: 'deepsink',  name: 'DeepSink',              kind: 'lab',  ceo: 'Liang Wenfeng-ish',  quip: 'Trained it on a budget. Allegedly.', color: '#6cc0ff' },
  { id: 'mistrial',  name: 'Mistrial AI',           kind: 'lab',  ceo: 'Arthur Menschy',     quip: 'Le weights. Le lawsuit.', color: '#ffb35c' },
  { id: 'nvidious',  name: 'Nvidious',              kind: 'chip', ceo: 'Jenson Hwang',       quip: 'The more you buy, the more you save. Trust the jacket.', color: '#8fd400' },
  { id: 'amdude',    name: 'Advanced Micro Dudes',  kind: 'chip', ceo: 'Lisa Soup',          quip: 'Almost as fast. Definitely cheaper. Drivers pending.', color: '#ff6b5c' },
  { id: 'intellect', name: 'Intellect',             kind: 'chip', ceo: 'Pat Gelsinker',      quip: 'Foundry pivot incoming. Any decade now.', color: '#6aa5ff' },
  { id: 'amazoon',   name: 'Amazoon Web Services',  kind: 'cloud',ceo: 'Andy Jazzy',         quip: 'Your margin is our opportunity.', color: '#ffb84d' },
  { id: 'cerebros',  name: 'Cerebros Systems',      kind: 'chip', ceo: 'Andrew Fieldman',    quip: 'Our chip is the size of your head.', color: '#c78cff' },
  { id: 'tsmc',      name: 'Taiwan Semiconductor-ish Co', kind: 'chip', ceo: 'C.C. Wei-ish', quip: 'We make everything. Please do not look at the map.', color: '#e8e8e8' }
]
export const corp = (id: string): Corp => CORPS.find((c) => c.id === id) ?? CORPS[0]

/** Leaderboard of rival models (release tick in hours since 2023-01-01, Elo). */
export interface RivalRelease { corp: string; name: string; month: number; elo: number; paramsB: number }
export const RIVAL_RELEASES: RivalRelease[] = [
  { corp: 'openaye',   name: 'GPTea 4',            month: 2,  elo: 1520, paramsB: 1800 },
  { corp: 'ratthropic',name: 'Clawed 1',           month: 3,  elo: 1440, paramsB: 130 },
  { corp: 'qooqle',    name: 'Palmy 2',            month: 5,  elo: 1420, paramsB: 340 },
  { corp: 'meeta',     name: 'Llamma 2',           month: 7,  elo: 1400, paramsB: 70 },
  { corp: 'qooqle',    name: 'Gemmini Ultra',      month: 12, elo: 1560, paramsB: 1500 },
  { corp: 'ratthropic',name: 'Clawed 3 Opus-ish',  month: 14, elo: 1590, paramsB: 2000 },
  { corp: 'meeta',     name: 'Llamma 3 405B',      month: 19, elo: 1570, paramsB: 405 },
  { corp: 'openaye',   name: 'GPTea 4o-no',        month: 17, elo: 1600, paramsB: 1800 },
  { corp: 'deepsink',  name: 'DeepSink V3',        month: 24, elo: 1610, paramsB: 671 },
  { corp: 'exai',      name: 'Grokk 3',            month: 26, elo: 1640, paramsB: 3000 },
  { corp: 'openaye',   name: 'GPTea 5',            month: 31, elo: 1700, paramsB: 5000 },
  { corp: 'ratthropic',name: 'Clawed 4',           month: 33, elo: 1710, paramsB: 4000 },
  { corp: 'qooqle',    name: 'Gemmini 3',          month: 35, elo: 1720, paramsB: 6000 }
]
export const MODEL_SUFFIXES = ['Mini', 'Pro', 'Max', 'Ultra', 'Lite', 'Turbo', 'Prime', 'XL', 'Nano', 'Omega']
export const AI_NAME_PARTS = {
  a: ['Quasi', 'Neuro', 'Synth', 'Hyper', 'Mega', 'Giga', 'Para', 'Omni', 'Trans', 'Flux', 'Zeta', 'Axo'],
  b: ['mind', 'bot', 'former', 'sphere', 'brain', 'GPT', 'lama', 'tron', 'vision', 'sage', 'wit', 'oracle']
}

export interface Character { id: string; name: string; role: string; bio: string; perk: string }
export const ADVISORS: Character[] = [
  { id: 'cfo',  name: 'Penny Pinchley',          role: 'CFO',             bio: 'Reads every invoice twice and your mind once.',        perk: '-8% loan interest' },
  { id: 'cto',  name: 'Dr. Tensor McFlops',      role: 'CTO',             bio: 'Has a spreadsheet for MFU. Names his GPUs.',            perk: '+4% training MFU' },
  { id: 'cpo',  name: 'Wattson Ampère',          role: 'Chief Power Officer', bio: 'Speaks fluent transformer. Hums at 60 Hz.',         perk: '-6% power cost' },
  { id: 'cool', name: 'Frostine Chiller',        role: 'Head of Cooling', bio: 'Once cooled a pizza with a CDU. Out of spite.',          perk: '+5% cooling COP' },
  { id: 'res',  name: 'Prof. Backprop Gradienté',role: 'Head of Research',bio: 'Descends every gradient and every argument.',            perk: '+10% research speed' },
  { id: 'pr',   name: 'Hype Marketson',          role: 'Head of Hype',    bio: 'Calls every benchmark a breakthrough.',                  perk: '+6% inference demand' },
  { id: 'ops',  name: 'Rack N. Stack',           role: 'Head of Ops',     bio: 'Has never seen a cable he did not label.',               perk: '-15% repair time' }
]
export const CUSTOMERS = [
  'Dreamworks of Pixels', 'Bankruptcy Capital LLC', 'Hedge-Fund-Gnome Partners', 'Lunar Pharma', 'AutoPilot Motors',
  'Cheapo Chatbots Inc', 'Genome-ish Labs', 'Seed-Stage Slop', 'Pentagon-adjacent Defense Corp', 'University of Tenure',
  'StreamFlix', 'ShopSphere', 'Totally Legit Crypto Miners', 'MegaCorp HR Bots', 'Midjourney-ish Art Co'
]
