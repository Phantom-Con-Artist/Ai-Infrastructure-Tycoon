/** Fictional (parody) universe. Nothing here names a real trademark. */
/** Brand-mark shapes, drawn by the renderer's BrandMark. Original geometry only. */
export type MarkShape = 'orbit' | 'stack' | 'spark' | 'knot' | 'wave' | 'prism' | 'chip' | 'hex' | 'bloom' | 'arc' | 'grid' | 'eye' | 'bolt' | 'ring' | 'delta' | 'cube' | 'flame' | 'leaf' | 'pulse' | 'shard'
/** What a company is famous for. Feeds flavour now and modality competition later. */
export type CorpFocus = 'frontier' | 'open' | 'image' | 'speech' | 'coding' | 'data' | 'hub' | 'search' | 'gpu' | 'asic' | 'memory' | 'foundry' | 'network' | 'cloud' | 'neocloud' | 'devices'
export interface Corp { id: string; name: string; kind: 'lab' | 'chip' | 'cloud' | 'both'; ceo: string; quip: string; color: string; mark: MarkShape; focus: CorpFocus; hq: string }

export const CORPS: Corp[] = [
  { id: 'qooqle',    name: 'Qooqle',                kind: 'both', ceo: 'Sundae Pitchfork',   quip: 'Do the right thing, unless it is slower.', color: '#6ea8ff', mark: 'orbit', focus: 'search', hq: 'Mountain View-ish' },
  { id: 'nicosoft',  name: 'Nicosoft',              kind: 'both', ceo: 'Sadya Nutella',      quip: 'Bundles an AI with everything. Everything.', color: '#4dd2c2', mark: 'grid', focus: 'cloud', hq: 'Redmond-ish' },
  { id: 'ratthropic',name: 'Ratthropic',            kind: 'lab',  ceo: 'Dariyo Amodeus',     quip: 'Safety first. Also second. Also fundraising.', color: '#e0a26c', mark: 'spark', focus: 'frontier', hq: 'San Francisco' },
  { id: 'openaye',   name: 'OpenAye',               kind: 'lab',  ceo: "Sam Altmann't",      quip: 'Not open. Not sorry.', color: '#9cdc7a', mark: 'knot', focus: 'frontier', hq: 'San Francisco' },
  { id: 'meeta',     name: 'Meeta Platforms',       kind: 'lab',  ceo: 'Marc Zuckerbork',    quip: 'Weights are free. Servers are not.', color: '#7a8cff', mark: 'ring', focus: 'open', hq: 'Menlo Park-ish' },
  { id: 'exai',      name: 'Ex-AI',                 kind: 'lab',  ceo: 'Elan Muskrat',       quip: 'Maximally truth-seeking. Minimally on schedule.', color: '#d0d0d0', mark: 'delta', focus: 'frontier', hq: 'Memphis-ish' },
  { id: 'deepsink',  name: 'DeepSink',              kind: 'lab',  ceo: 'Liang Wenfeng-ish',  quip: 'Trained it on a budget. Allegedly.', color: '#6cc0ff', mark: 'wave', focus: 'open', hq: 'Hangzhou-ish' },
  { id: 'mistrial',  name: 'Mistrial AI',           kind: 'lab',  ceo: 'Arthur Menschy',     quip: 'Le weights. Le lawsuit.', color: '#ffb35c', mark: 'flame', focus: 'open', hq: 'Paris' },
  { id: 'nvidious',  name: 'Nvidious',              kind: 'chip', ceo: 'Jenson Hwang',       quip: 'The more you buy, the more you save. Trust the jacket.', color: '#8fd400', mark: 'eye', focus: 'gpu', hq: 'Santa Clara' },
  { id: 'amdude',    name: 'Advanced Micro Dudes',  kind: 'chip', ceo: 'Lisa Soup',          quip: 'Almost as fast. Definitely cheaper. Drivers pending.', color: '#ff6b5c', mark: 'arc', focus: 'gpu', hq: 'Santa Clara-ish' },
  { id: 'intellect', name: 'Intellect',             kind: 'chip', ceo: 'Pat Gelsinker',      quip: 'Foundry pivot incoming. Any decade now.', color: '#6aa5ff', mark: 'hex', focus: 'foundry', hq: 'Santa Clara-adjacent' },
  { id: 'amazoon',   name: 'Amazoon Web Services',  kind: 'cloud',ceo: 'Andy Jazzy',         quip: 'Your margin is our opportunity.', color: '#ffb84d', mark: 'bolt', focus: 'cloud', hq: 'Seattle-ish' },
  { id: 'cerebros',  name: 'Cerebros Systems',      kind: 'chip', ceo: 'Andrew Fieldman',    quip: 'Our chip is the size of your head.', color: '#c78cff', mark: 'cube', focus: 'asic', hq: 'Sunnyvale-ish' },
  { id: 'tsmc',      name: 'Taiwan Semiconductor-ish Co', kind: 'chip', ceo: 'C.C. Wei-ish', quip: 'We make everything. Please do not look at the map.', color: '#e8e8e8', mark: 'chip', focus: 'foundry', hq: 'Hsinchu-ish' },
  { id: 'coheer',    name: 'Coheer',                kind: 'lab',  ceo: 'Aidan Gomezz',       quip: 'Enterprise AI. Very enterprise. Extremely AI.', color: '#ff7a8a', mark: 'bloom', focus: 'frontier', hq: 'Toronto-ish' },
  { id: 'halfjourney',name: 'Halfjourney',          kind: 'lab',  ceo: 'David Holds',        quip: 'We make pictures. Of hands. Mostly correct hands.', color: '#e9e2d0', mark: 'shard', focus: 'image', hq: 'A Discord server' },
  { id: 'unstability',name: 'Unstability AI',       kind: 'lab',  ceo: 'Emad Mostly',        quip: 'Open weights, open lawsuits, open position for CEO.', color: '#b07cff', mark: 'prism', focus: 'image', hq: 'London-ish' },
  { id: 'elevenlaps',name: 'ElevenLaps',            kind: 'lab',  ceo: 'Matty Stanley',      quip: 'Your voice, but it never needs water.', color: '#f2f2f2', mark: 'pulse', focus: 'speech', hq: 'Warsaw-ish' },
  { id: 'huggingfeels',name: 'HuggingFeels',        kind: 'lab',  ceo: 'Clem Delunge',       quip: 'A million models. Three of them work.', color: '#ffcf3d', mark: 'bloom', focus: 'hub', hq: 'Brooklyn-ish' },
  { id: 'runaway',   name: 'Runaway ML',            kind: 'lab',  ceo: 'Cris Valencia',      quip: 'Text to video. Video to invoice.', color: '#d8f45a', mark: 'arc', focus: 'image', hq: 'New York-ish' },
  { id: 'scalp',     name: 'Scalp AI',              kind: 'lab',  ceo: 'Alexandr Wrong',     quip: 'Data labelling at scale. The scale is 100,000 contractors.', color: '#7a6cff', mark: 'stack', focus: 'data', hq: 'San Francisco' },
  { id: 'cursed',    name: 'Cursed',                kind: 'lab',  ceo: 'Michael Truel',      quip: 'Tab, tab, tab, ship. What could go wrong?', color: '#c8c8d0', mark: 'cube', focus: 'coding', hq: 'San Francisco' },
  { id: 'overthink', name: 'Overthinking Machines', kind: 'lab',  ceo: 'Mira Muratti',       quip: 'Raised two billion before the first product. Thinking about it.', color: '#9ad1ff', mark: 'ring', focus: 'frontier', hq: 'San Francisco' },
  { id: 'safeish',   name: 'Safe-ish Superintelligence', kind: 'lab', ceo: 'Ilya Sutskeever', quip: 'One product. It is a secret. It is safe. Probably.', color: '#e8e8f0', mark: 'eye', focus: 'frontier', hq: 'Palo Alto & Tel Aviv-ish' },
  { id: 'pear',      name: 'Pear Inc.',             kind: 'both', ceo: 'Tim Crook',          quip: 'AI, but private. And late. And beautiful.', color: '#bfc6cf', mark: 'leaf', focus: 'devices', hq: 'Cupertino-ish' },
  { id: 'alibabble', name: 'Alibabble Cloud',       kind: 'both', ceo: 'Eddie Wu-hoo',       quip: 'Open weights for everyone. Servers for some.', color: '#ff8a3d', mark: 'wave', focus: 'cloud', hq: 'Hangzhou-ish' },
  { id: 'baiduh',    name: 'Baiduh',                kind: 'both', ceo: 'Robin Leigh',        quip: 'Search, but make it chat.', color: '#5a7bff', mark: 'orbit', focus: 'search', hq: 'Beijing-ish' },
  { id: 'oracular',  name: 'Oracular Cloud',        kind: 'cloud',ceo: 'Larry Ellisong',     quip: 'We sold databases. Now we sell gigawatts.', color: '#ff5a4a', mark: 'ring', focus: 'cloud', hq: 'Austin-ish' },
  { id: 'coreweevil',name: 'CoreWeevil',            kind: 'cloud',ceo: 'Mike Intrastate',    quip: 'Ex-crypto miners. Now: GPU landlords.', color: '#4ad0a0', mark: 'grid', focus: 'neocloud', hq: 'Livingston-ish' },
  { id: 'lambada',   name: 'Lambada Labs',          kind: 'cloud',ceo: 'Steve Balloon',      quip: 'One-click clusters. Two-click invoices.', color: '#9b7bff', mark: 'delta', focus: 'neocloud', hq: 'San Jose-ish' },
  { id: 'grawq',     name: 'Grawq',                 kind: 'chip', ceo: 'Jon Ross-ish',       quip: 'Fast tokens. No HBM. No regrets.', color: '#f26b3a', mark: 'bolt', focus: 'asic', hq: 'Mountain View-ish' },
  { id: 'armless',   name: 'Armless Holdings',      kind: 'chip', ceo: 'Rene Hasnt',         quip: 'We license the shape of thinking.', color: '#30b8e0', mark: 'arc', focus: 'asic', hq: 'Cambridge-ish' },
  { id: 'samsong',   name: 'Samsong Semiconductor', kind: 'chip', ceo: 'Jay Y. Leigh',       quip: 'HBM yields improving. Any quarter now.', color: '#3a6cff', mark: 'orbit', focus: 'memory', hq: 'Suwon-ish' },
  { id: 'hynox',     name: 'SK Hynox',              kind: 'chip', ceo: 'Kwak Noh-jeong-ish', quip: 'Sold out of memory through 2027. And our patience.', color: '#ff4a6a', mark: 'stack', focus: 'memory', hq: 'Icheon-ish' },
  { id: 'broadcomb', name: 'Broadcomb',             kind: 'chip', ceo: 'Hock Tangent',       quip: 'Custom silicon, custom pricing, custom licensing.', color: '#e2463a', mark: 'pulse', focus: 'network', hq: 'Palo Alto-ish' }
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

/** Rival datacenter campuses on the globe (parody locations; flavour + network arcs). */
export interface RivalHub { corp: string; name: string; ll: [number, number] }
export const RIVAL_HUBS: RivalHub[] = [
  { corp: 'qooqle', name: 'Council Bluffs-ish', ll: [-95.86, 41.26] }, { corp: 'qooqle', name: 'Hamina-ish', ll: [27.2, 60.57] }, { corp: 'qooqle', name: 'Jurong-ish', ll: [103.8, 1.35] },
  { corp: 'nicosoft', name: 'Quincy-ish', ll: [-119.85, 47.23] }, { corp: 'nicosoft', name: 'Pune-ish', ll: [73.85, 18.52] }, { corp: 'nicosoft', name: 'Osasco-ish', ll: [-46.6, -23.5] },
  { corp: 'amazoon', name: 'Ashburn-ish', ll: [-77.49, 39.04] }, { corp: 'amazoon', name: 'Rhein-Main-ish', ll: [8.6, 50.0] }, { corp: 'amazoon', name: 'Tokyo-ish', ll: [139.7, 35.7] }, { corp: 'amazoon', name: 'Sydney-ish', ll: [151.2, -33.87] },
  { corp: 'meeta', name: 'Prineville-ish', ll: [-120.8, 44.3] }, { corp: 'meeta', name: 'Odense-ish', ll: [10.4, 55.4] },
  { corp: 'openaye', name: 'Stargate-ish', ll: [-99.73, 32.45] }, { corp: 'exai', name: 'Colossus-ish', ll: [-90.05, 35.15] },
  { corp: 'oracular', name: 'Lone Star-ish', ll: [-97.7, 30.27] }, { corp: 'coreweevil', name: 'Plano-ish', ll: [-96.7, 33.0] },
  { corp: 'alibabble', name: 'Zhangbei-ish', ll: [114.7, 41.15] }, { corp: 'baiduh', name: 'Yangquan-ish', ll: [113.6, 37.86] },
  { corp: 'deepsink', name: 'Ningbo-ish', ll: [121.5, 29.87] }, { corp: 'mistrial', name: 'Essonne-ish', ll: [2.35, 48.6] },
  { corp: 'tsmc', name: 'Hsinchu-ish fab', ll: [120.97, 24.8] }, { corp: 'samsong', name: 'Pyeongtaek-ish fab', ll: [127.1, 36.99] },
  { corp: 'ratthropic', name: 'Rainier-ish', ll: [-85.6, 40.4] }, { corp: 'safeish', name: 'Tel Aviv-ish', ll: [34.78, 32.08] }
]
