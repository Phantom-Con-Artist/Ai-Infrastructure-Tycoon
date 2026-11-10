/**
 * Transformer architecture maths, datasets and evaluations.
 * Parameter counts follow the standard decoder-only formulas (SwiGLU FFN, GQA/MLA attention, MoE).
 */
export type Attn = 'mha' | 'gqa' | 'mla'
export interface ArchSpec {
  layers: number; dModel: number; heads: number; kvHeads: number; attn: Attn
  ffnMult: number            // FFN hidden size / d_model (per expert for MoE)
  vocabK: number; ctxK: number
  experts: number; topK: number; shared: number   // experts=1 → dense
}
export interface ArchStats { totalB: number; activeB: number; attnPerLayer: number; ffnPerLayer: number; embedB: number; kvBytesPerToken: number; aspect: number }

export function archStats(a: ArchSpec): ArchStats {
  const d = a.dModel, hd = d / a.heads
  const kv = a.attn === 'mha' ? a.heads : a.kvHeads
  const attnPerLayer = a.attn === 'mla'
    ? d * d * 2 + 2 * d * 512 + 2 * 512 * d // latent KV compression (rank 512)
    : 2 * d * d + 2 * d * kv * hd           // Q, O full; K, V shared across groups
  const ffnOne = 3 * d * (a.ffnMult * d)    // SwiGLU: gate, up, down
  const moe = a.experts > 1
  const ffnTotal = moe ? (a.experts + a.shared) * ffnOne + d * a.experts : ffnOne
  const ffnActive = moe ? (a.topK + a.shared) * ffnOne + d * a.experts : ffnOne
  const embed = a.vocabK * 1000 * d
  const totalB = (a.layers * (attnPerLayer + ffnTotal) + embed) / 1e9
  const activeB = (a.layers * (attnPerLayer + ffnActive) + embed) / 1e9
  const kvBytesPerToken = a.attn === 'mla' ? a.layers * 512 * 2 : a.layers * 2 * kv * hd * 2
  return { totalB, activeB, attnPerLayer, ffnPerLayer: ffnTotal, embedB: embed / 1e9, kvBytesPerToken, aspect: d / a.layers }
}
/** Small architecture penalties/bonuses on loss: depth/width aspect, vocab, attention type. */
export function archLossDelta(a: ArchSpec): number {
  const s = archStats(a)
  const aspectPen = 0.012 * Math.abs(Math.log(s.aspect / 110))      // Kaplan: broad optimum near d/L ≈ 100
  const vocabPen = 0.004 * Math.abs(Math.log(a.vocabK / 128))
  const attn = a.attn === 'mla' ? -0.006 : a.attn === 'gqa' ? 0 : 0.002
  const routing = a.experts > 1 ? 0.01 * Math.max(0, Math.log2(a.topK) - 3) : 0 // too many active experts dilutes routing
  return aspectPen + vocabPen + attn + routing
}

export interface Template { id: string; name: string; corp: string; blurb: string; arch: ArchSpec; tokensT: number; absurd?: boolean }
const A = (layers: number, dModel: number, heads: number, kvHeads: number, ffnMult: number, vocabK = 128, ctxK = 8, experts = 1, topK = 1, shared = 0, attn: Attn = 'gqa'): ArchSpec => ({ layers, dModel, heads, kvHeads, ffnMult, vocabK, ctxK, experts, topK, shared, attn })
export const TEMPLATES: Template[] = [
  { id: 'gptea2', name: 'GPTea-2 Small', corp: 'openaye', blurb: 'The 124M classic. Runs on a toaster.', arch: A(12, 768, 12, 12, 4, 50, 1, 1, 1, 0, 'mha'), tokensT: 0.01 },
  { id: 'llamma8', name: 'Llamma-3 8B', corp: 'meeta', blurb: 'The open-weights workhorse.', arch: A(32, 4096, 32, 8, 3.5, 128, 8), tokensT: 15 },
  { id: 'mistrial7', name: 'Mistrial 7B', corp: 'mistrial', blurb: 'Small, sharp, French.', arch: A(32, 4096, 32, 8, 3.5, 32, 32), tokensT: 8 },
  { id: 'mixtrial', name: 'Mixtrial 8×7B', corp: 'mistrial', blurb: 'Eight experts, two awake at a time.', arch: A(32, 4096, 32, 8, 3.5, 32, 32, 8, 2), tokensT: 8 },
  { id: 'llamma70', name: 'Llamma-3 70B', corp: 'meeta', blurb: 'Big dense energy.', arch: A(80, 8192, 64, 8, 3.5, 128, 8), tokensT: 15 },
  { id: 'llamma405', name: 'Llamma-3 405B', corp: 'meeta', blurb: '16,000 GPUs and a prayer.', arch: A(126, 16384, 128, 8, 3.25, 128, 128), tokensT: 15.6 },
  { id: 'deepsink3', name: 'DeepSink V3', corp: 'deepsink', blurb: '671B total, 37B active. Trained on a budget, allegedly.', arch: A(61, 7168, 128, 128, 0.286, 129, 128, 256, 8, 1, 'mla'), tokensT: 14.8 },
  { id: 'gptea5', name: 'GPTea-5-ish', corp: 'openaye', blurb: 'Rumoured config. Lawyers say it is fiction.', arch: A(120, 18432, 144, 16, 0.5, 200, 256, 128, 8, 2, 'mla'), tokensT: 60 },
  { id: 'omega', name: 'Omega-100T', corp: '', blurb: 'One hundred trillion parameters. Why? Because you can.', arch: A(400, 65536, 512, 64, 0.25, 256, 1024, 2048, 16, 4, 'mla'), tokensT: 2000, absurd: true },
  { id: 'galaxy', name: 'Galaxy Brain ∞', corp: '', blurb: 'A mixture of a million experts. Requires a Dyson swarm.', arch: A(1000, 131072, 1024, 128, 0.125, 512, 10000, 1_000_000, 32, 8, 'mla'), tokensT: 100000, absurd: true }
]

export type Domain = 'web' | 'code' | 'math' | 'books' | 'science' | 'multilingual' | 'dialogue' | 'synthetic'
export interface DatasetSpec { id: string; name: string; domain: Domain; tokensT: number; quality: number; usd: number; legalRisk: number; source: string; needsTech?: string; year: number }
export const DATASETS: DatasetSpec[] = [
  { id: 'crawl', name: 'Common Crawl-ish dump', domain: 'web', tokensT: 6, quality: 0.75, usd: 0, legalRisk: 0.25, source: 'Free download', year: 2023 },
  { id: 'fineweb', name: 'FineWeb-ish (filtered)', domain: 'web', tokensT: 15, quality: 1.0, usd: 2e6, legalRisk: 0.15, source: 'Open dataset + your GPUs for filtering', year: 2024 },
  { id: 'githug', name: 'GitHug code archive', domain: 'code', tokensT: 1.5, quality: 1.1, usd: 4e6, legalRisk: 0.3, source: 'Scraped repos (licences: vibes)', year: 2023 },
  { id: 'stack-oops', name: 'Stack Oopsflow Q&A', domain: 'code', tokensT: 0.2, quality: 1.25, usd: 30e6, legalRisk: 0.02, source: 'Licensed deal', year: 2024 },
  { id: 'arxiv', name: 'arXiv-ish papers', domain: 'science', tokensT: 0.1, quality: 1.3, usd: 1e6, legalRisk: 0.05, source: 'Open access', year: 2023 },
  { id: 'proofs', name: 'Competition math + proofs', domain: 'math', tokensT: 0.05, quality: 1.4, usd: 8e6, legalRisk: 0.03, source: 'Contracted mathematicians', year: 2023 },
  { id: 'books3', name: 'Shadow library "Books4"', domain: 'books', tokensT: 0.3, quality: 1.25, usd: 0, legalRisk: 0.9, source: 'Torrent. Absolutely not legal.', year: 2023 },
  { id: 'publisher', name: 'Big Five publisher licence', domain: 'books', tokensT: 0.4, quality: 1.3, usd: 150e6, legalRisk: 0.0, source: 'Licensed', year: 2024 },
  { id: 'redd', name: 'Reddish forum firehose', domain: 'dialogue', tokensT: 1, quality: 0.9, usd: 60e6, legalRisk: 0.02, source: 'API licence', year: 2024 },
  { id: 'polyglot', name: 'Polyglot 200-language corpus', domain: 'multilingual', tokensT: 3, quality: 0.95, usd: 12e6, legalRisk: 0.1, source: 'Mixed', year: 2024 },
  { id: 'synth', name: 'Synthetic reasoning traces', domain: 'synthetic', tokensT: 2, quality: 1.35, usd: 40e6, legalRisk: 0.0, source: 'Generated by your own models', needsTech: 'synth', year: 2024 },
  { id: 'synth-xl', name: 'Synthetic universe (self-play)', domain: 'synthetic', tokensT: 50, quality: 1.3, usd: 900e6, legalRisk: 0.0, source: 'Generated by your own models, at scale', needsTech: 'reasoning', year: 2025 },
  { id: 'everything', name: 'Every word ever written', domain: 'web', tokensT: 500, quality: 0.9, usd: 20e9, legalRisk: 0.5, source: 'Bought the internet. Literally.', needsTech: 'm-and-a', year: 2027 }
]

export interface EvalSpec { id: string; name: string; parody: string; domains: Domain[]; difficulty: number; scaleNeed: number }
export const EVALS: EvalSpec[] = [
  { id: 'mmlu', name: 'MMLU-ish', parody: 'Massive Multitask Lengthy Understanding', domains: ['web', 'books', 'science'], difficulty: 0.1, scaleNeed: 0 },
  { id: 'gsm', name: 'GSM-Ate-K', parody: 'Grade-school maths, but the student ate the homework', domains: ['math', 'synthetic'], difficulty: 0.25, scaleNeed: 0.1 },
  { id: 'humaneval', name: 'HumanEvil', parody: 'Can it write Python without summoning demons?', domains: ['code'], difficulty: 0.3, scaleNeed: 0.1 },
  { id: 'gpqa', name: 'GPQA-Diamond-Hands', parody: 'PhD questions nobody can Google', domains: ['science', 'math'], difficulty: 0.6, scaleNeed: 0.4 },
  { id: 'swe', name: 'SWE-Bench-Press', parody: 'Fix real bugs in real repos. Lift heavy.', domains: ['code', 'synthetic'], difficulty: 0.65, scaleNeed: 0.4 },
  { id: 'arc', name: 'ARC-AGI-Ish', parody: 'Coloured squares that humans find trivial and models find existential', domains: ['synthetic', 'math'], difficulty: 0.9, scaleNeed: 0.7 },
  { id: 'hle', name: "Humanity's Last Exam (Really)", parody: 'The final boss of benchmarks', domains: ['science', 'math', 'books'], difficulty: 1.0, scaleNeed: 0.85 }
]
/** Map Elo-like capability + domain mix share to a 0–100 benchmark score (logistic). */
export function evalScore(e: EvalSpec, elo: number, mix: Partial<Record<Domain, number>>, reasoning: number): number {
  const cap = (elo - 1300) / 500                       // 0 at Elo 1300, 1 at 1800
  const dom = e.domains.reduce((a, d) => a + (mix[d] ?? 0), 0)
  const z = 5 * (cap - e.difficulty) + 1.5 * (dom - 0.3) + reasoning * 1.5 * e.difficulty - 2 * e.scaleNeed * Math.max(0, 0.6 - cap)
  return Math.round(1000 / (1 + Math.exp(-z))) / 10
}
export const RIVAL_MIX: Partial<Record<Domain, number>> = { web: 0.55, code: 0.15, math: 0.06, books: 0.08, science: 0.06, dialogue: 0.05, synthetic: 0.05 }
