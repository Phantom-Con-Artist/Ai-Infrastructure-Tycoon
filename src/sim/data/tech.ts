/**
 * The R&D tree. Every capability in the game is gated here. Techs sit in a branch and a tier
 * (level); repeatable techs can be researched forever with escalating cost and stacking effects.
 *
 * Effects are strings: `unlock:<flag>` or `<stat>:<value>` (summed across researched techs).
 */
export type Branch = 'Facilities' | 'Power' | 'Network' | 'Training' | 'Models' | 'Modalities' | 'Silicon' | 'Memory' | 'Fab' | 'Cloud' | 'Business' | 'Moonshots'
export interface TechSpec {
  id: string; name: string; blurb: string; branch: Branch; tier: number
  costUsd: number; days: number; requires?: string[]; effect: string
  repeatable?: { growth: number; max?: number }
}
export const BRANCHES: Branch[] = ['Facilities', 'Power', 'Network', 'Training', 'Models', 'Modalities', 'Silicon', 'Memory', 'Fab', 'Cloud', 'Business', 'Moonshots']

const T = (id: string, branch: Branch, tier: number, name: string, costM: number, days: number, effect: string, blurb: string, requires?: string[], repeatable?: TechSpec['repeatable']): TechSpec =>
  ({ id, branch, tier, name, costUsd: costM * 1e6, days, effect, blurb, requires, repeatable })

export const TECHS: TechSpec[] = [
  // ── Facilities
  T('hotaisle', 'Facilities', 1, 'Hot-aisle containment', 1, 30, 'airCop:0.15', 'Plastic curtains. +15% COP for air-cooled halls.'),
  T('rdhx', 'Facilities', 2, 'Rear-door heat exchangers', 1.5, 45, 'unlock:rdhx', 'Radiators bolted to the back of racks. 45 kW racks.', ['hotaisle']),
  T('dlc', 'Facilities', 3, 'Direct-to-chip liquid cooling', 8, 120, 'unlock:dlc', 'Cold plates and CDUs. 130 kW racks.', ['rdhx']),
  T('prefab', 'Facilities', 3, 'Modular prefab halls', 7, 90, 'build:0.4', 'Halls arrive on trucks. Build time −40%.', ['hotaisle']),
  T('immersion', 'Facilities', 4, 'Two-phase immersion', 25, 240, 'unlock:immersion', 'Dunk the servers in boiling fluorocarbon. 220 kW racks.', ['dlc']),
  T('robots', 'Facilities', 5, 'Rack-swapping robots', 40, 200, 'repair:0.5', 'Tireless technicians. Repairs twice as fast.', ['immersion']),
  T('cooling-mk', 'Facilities', 2, 'Chiller tuning Mk', 2, 30, 'airCop:0.04', 'Squeeze another 4% COP. Again. And again.', ['hotaisle'], { growth: 1.7, max: 20 }),
  // ── Power
  T('smart-grid', 'Power', 1, 'Demand response', 1.5, 40, 'powerCost:0.04', 'Sell flexibility back to the grid. −4% energy bill.'),
  T('ppa', 'Power', 2, 'Power purchase agreements', 4, 60, 'powerCost:0.08', 'Lock long-term prices. −8% energy bill.', ['smart-grid']),
  T('microgrid', 'Power', 3, 'Microgrid controller', 12, 120, 'unlock:microgrid', 'Islands your campus during outages.', ['ppa']),
  T('smr', 'Power', 4, 'SMR licensing', 60, 540, 'unlock:smr', 'Small modular reactors on site.', ['microgrid']),
  T('fusion', 'Power', 6, 'Tokamak-in-a-box', 2500, 1460, 'unlock:fusion', 'Fusion is 30 years away. You made it 4.', ['smr']),
  T('grid-mk', 'Power', 2, 'Transformer efficiency Mk', 3, 45, 'powerCost:0.02', 'Lower losses, every level.', ['smart-grid'], { growth: 1.7, max: 15 }),
  // ── Network
  T('ib400', 'Network', 1, 'InfiniBand NDR 400G', 3, 60, 'unlock:ib400', 'Training that scales past a few hundred GPUs.'),
  T('ib800', 'Network', 3, 'InfiniBand XDR 800G', 20, 180, 'unlock:ib800', 'Rail-optimised 800G fabrics.', ['ib400']),
  T('ib1600', 'Network', 5, 'Co-packaged optics 1.6T', 80, 360, 'unlock:ib1600', 'Light instead of copper.', ['ib800']),
  T('multisite', 'Network', 6, 'Multi-campus training', 300, 400, 'unlock:multisite', 'Train one model across continents.', ['ib1600']),
  // ── Training
  T('flash', 'Training', 1, 'FlashAttention-ish kernels', 4, 60, 'mfu:0.08', '+8% MFU.'),
  T('ckpt', 'Training', 1, 'Async checkpointing', 2.5, 45, 'restart:0.5', 'Half the time lost per failure.'),
  T('fp8', 'Training', 2, 'FP8 mixed precision', 12, 120, 'mfu:0.15', '+15% MFU; lets your chips advertise FP8.', ['flash']),
  T('fp4', 'Training', 4, 'FP4 microscaling', 40, 200, 'mfu:0.12', 'Four bits ought to be enough for anybody.', ['fp8']),
  T('compiler-mk', 'Training', 2, 'Compiler autotuning Mk', 5, 60, 'mfu:0.02', '+2% MFU per level.', ['flash'], { growth: 1.6, max: 25 }),
  // ── Models
  // ── Modalities: each one is a separate business line (sim/foundry.ts)
  T('finetune', 'Modalities', 1, 'Fine-tuning & LoRA', 3, 30, 'unlock:finetune', 'Start from any base model. A few billion tokens, a few days, a better model.'),
  T('mod-code', 'Modalities', 1, 'Code models', 6, 60, 'unlock:mod-code', 'Coding models: smaller market, 1.6× the price per token.'),
  T('mod-image', 'Modalities', 2, 'Diffusion image models', 14, 90, 'unlock:mod-image', 'Image generation. Mind the hands.', ['finetune']),
  T('mod-speech', 'Modalities', 2, 'Speech & voice', 12, 90, 'unlock:mod-speech', 'Text-to-speech and speech-to-text. Your nan will never know.', ['finetune']),
  T('mod-video', 'Modalities', 3, 'Video generation', 40, 150, 'unlock:mod-video', 'Seconds of video for the price of a car. Viral by default.', ['mod-image']),
  T('mod-omni', 'Modalities', 4, 'Omni models', 80, 200, 'unlock:mod-omni', 'One model to see, hear, speak and code.', ['mod-video', 'mod-speech', 'mod-code']),
  T('moe', 'Models', 2, 'Mixture-of-Experts', 15, 150, 'unlock:moe', 'Active params ≪ total params.'),
  T('distill', 'Models', 2, 'Distillation pipeline', 10, 120, 'distill:60', 'Small models punch up (+60 Elo ≤70B).'),
  T('synth', 'Models', 3, 'Synthetic data engine', 18, 180, 'dq:0.15', '+0.15 data quality.', ['distill']),
  T('speculative', 'Models', 2, 'Speculative decoding', 6, 90, 'infer:0.4', '+40% inference throughput.'),
  T('reasoning', 'Models', 4, 'Test-time reasoning', 60, 240, 'elo:80', 'Models think before they speak. +80 Elo.', ['synth']),
  T('agents', 'Models', 5, 'Autonomous agents', 150, 300, 'demand:0.5', 'Your model does jobs, not chats. +50% token demand.', ['reasoning']),
  T('eval-mk', 'Models', 3, 'Benchmark "optimisation" Mk', 8, 60, 'elo:12', '+12 Elo. Totally not teaching to the test.', ['distill'], { growth: 1.65, max: 30 }),
  // ── Silicon
  T('fabless', 'Silicon', 1, 'Chip design team', 25, 120, 'unlock:fabless', 'Design your own accelerators on 16 nm and 7 nm via a foundry.'),
  T('node-n5', 'Silicon', 2, '5 nm / 4 nm design kits', 60, 180, 'unlock:node-n5', 'EUV-era nodes.', ['fabless']),
  T('node-n3', 'Silicon', 3, '3 nm design kit', 120, 240, 'unlock:node-n3', 'FinFET\'s last stand.', ['node-n5']),
  T('node-n2', 'Silicon', 4, '2 nm GAA design kit', 250, 300, 'unlock:node-n2', 'Gate-all-around nanosheets.', ['node-n3']),
  T('node-a16', 'Silicon', 5, 'A16 backside power', 450, 360, 'unlock:node-a16', 'Power delivery from underneath. Half reticle on High-NA.', ['node-n2']),
  T('node-a14', 'Silicon', 6, 'A14 forksheet', 800, 420, 'unlock:node-a14', 'Ångström era.', ['node-a16']),
  T('arch-mk', 'Silicon', 2, 'Tensor core generation', 30, 150, 'arch:1', '+35% FLOP per transistor per generation.', ['fabless'], { growth: 1.8, max: 12 }),
  T('chiplets', 'Silicon', 2, 'Chiplets + CoWoS-S', 40, 180, 'unlock:chiplets', 'Two dies on a silicon interposer.', ['fabless']),
  T('cowos-l', 'Silicon', 3, 'CoWoS-L bridges', 90, 240, 'unlock:cowos-l', 'Four-die monsters.', ['chiplets']),
  T('soic', 'Silicon', 4, 'SoIC 3D stacking', 200, 300, 'unlock:soic', 'Stack dies on dies.', ['cowos-l']),
  T('waferscale', 'Silicon', 5, 'Wafer-scale integration', 500, 400, 'unlock:waferscale', 'The chip IS the wafer. 46,225 mm².', ['soic']),
  T('sdk', 'Silicon', 2, 'CUDA-ish software stack', 60, 200, 'eco:0.15', 'Kernels, compilers, a logo. Buyers trust you 15% more.', ['fabless']),
  T('dev-rel', 'Silicon', 3, 'Developer relations Mk', 20, 90, 'eco:0.04', 'Free hoodies at conferences. +4% ecosystem per level.', ['sdk'], { growth: 1.6, max: 20 }),
  T('cpu-design', 'Silicon', 3, 'CPU core team', 80, 240, 'unlock:cpu', 'Design your own server CPUs.', ['node-n5']),
  // ── Memory
  T('hbm3', 'Memory', 2, 'HBM3 PHY', 20, 120, 'unlock:hbm3', '6.4 Gb/s per pin.', ['fabless']),
  T('hbm3e', 'Memory', 3, 'HBM3e', 50, 180, 'unlock:hbm3e', '9.6 Gb/s, 24 Gb dies.', ['hbm3']),
  T('hbm4', 'Memory', 4, 'HBM4 2048-bit', 120, 240, 'unlock:hbm4', 'Double-wide interface.', ['hbm3e']),
  T('hbm4e', 'Memory', 5, 'HBM4e', 250, 300, 'unlock:hbm4e', '16-high stacks.', ['hbm4']),
  T('hbm5', 'Memory', 6, 'HBM5 hybrid bonding', 500, 360, 'unlock:hbm5', '4096-bit, 24-high. Absurd bandwidth.', ['hbm4e']),
  T('memory-design', 'Memory', 3, 'In-house DRAM', 150, 300, 'hbmCost:0.35', 'Make your own HBM. −35% memory cost.', ['hbm3e']),
  // ── Fab
  T('fab', 'Fab', 4, 'Build your own fab', 500, 365, 'unlock:fab', 'A cleanroom the size of 8 football fields. DUV tools only.', ['node-n3']),
  T('euv', 'Fab', 5, 'EUV qualification', 600, 365, 'unlock:euv', 'Buy and run Low-NA EUV scanners.', ['fab']),
  T('high-na', 'Fab', 6, 'High-NA EUV', 1200, 420, 'unlock:high-na', '0.55 NA anamorphic optics.', ['euv']),
  T('hyper-na', 'Fab', 7, 'Hyper-NA', 3000, 600, 'unlock:hyper-na', 'NA 0.75. Physics is starting to complain.', ['high-na']),
  T('yield-mk', 'Fab', 5, 'Yield learning Mk', 40, 90, 'yield:0.05', '−5% defect density per level.', ['fab'], { growth: 1.6, max: 20 }),
  // ── Cloud
  T('k8s', 'Cloud', 1, 'GPU orchestration', 1.5, 30, 'rentUtil:0.05', '+5% rental utilisation.'),
  T('marketplace', 'Cloud', 2, 'Self-serve console', 6, 90, 'rentUtil:0.08', 'Credit-card checkout for GPUs.', ['k8s']),
  T('serverless', 'Cloud', 3, 'Serverless inference', 20, 150, 'infer:0.2', '+20% inference throughput; scale to zero.', ['marketplace']),
  T('sovereign', 'Cloud', 4, 'Sovereign clouds', 60, 240, 'rentPrice:0.15', 'Governments pay +15% for a flag on the rack.', ['serverless']),
  // ── Business
  T('lobbying', 'Business', 1, 'Lobbying office', 3, 45, 'permit:0.25', 'Permits 25% faster. Very normal.'),
  T('ipo', 'Business', 3, 'IPO readiness', 30, 180, 'unlock:ipo', 'Go public. Raise billions. Quarterly calls forever.', ['lobbying']),
  T('m-and-a', 'Business', 4, 'M&A desk', 50, 180, 'unlock:acquire', 'Buy your rivals.', ['ipo']),
  T('brand-mk', 'Business', 2, 'Brand campaign Mk', 4, 45, 'demand:0.03', '+3% demand per level. Billboards on the moon eventually.', ['lobbying'], { growth: 1.55, max: 40 }),
  // ── Moonshots (endgame, absurd)
  T('orbital', 'Moonshots', 7, 'Orbital data centers', 5000, 900, 'unlock:orbital', 'Solar is free in space. Cooling is… a problem.', ['fusion']),
  T('dyson', 'Moonshots', 9, 'Dyson swarm (pilot)', 50000, 1800, 'unlock:dyson', 'Harvest the sun. Conquer Earth by out-computing it.', ['orbital']),
  T('agi', 'Moonshots', 8, 'Artificial General Intelligence', 20000, 1200, 'unlock:agi', 'It works. It wants a raise.', ['agents', 'node-a14'])
]
export const tech = (id: string): TechSpec | undefined => TECHS.find((t) => t.id === id)
/** Cost of the next level of a tech given how many levels are already owned. */
export const techCost = (t: TechSpec, owned: number): number => t.costUsd * Math.pow(t.repeatable?.growth ?? 1, owned)
export const techDays = (t: TechSpec, owned: number): number => Math.round(t.days * Math.pow(1.15, owned))
