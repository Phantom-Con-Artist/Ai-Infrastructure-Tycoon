import { Check, ChevronDown, ChevronUp } from 'lucide-react'
import { useWorld, useGame } from './store'
import type { Screen } from './nav'
import { useDraft } from './draft'

interface Step { title: string; body: string; screen: Screen; done: boolean }

/** The whole game in nine steps, from an empty company to a paying product. Each step ticks itself off from the world state. */
export function Tutorial() {
  const w = useWorld(); const go = useGame((s) => s.go)
  const [open, setOpen] = useDraft('tutorial.open', false)
  const halls = w.sites.flatMap((s) => s.halls)
  const mine = w.models.filter((m) => m.owner === 'player')
  const steps: Step[] = [
    { title: 'Buy land and build a hall', body: 'Sites → pick a region, claim a site, then build a hall. Concrete takes a few days.', screen: 'sites', done: halls.length > 0 },
    { title: 'Get power online', body: 'A hall needs grid power or a generator. Watch the power bar on the site; permits take time.', screen: 'sites', done: halls.some((h) => h.online) || w.sites.some((s) => s.utilityMw > 0 && halls.length > 0) },
    { title: 'Order servers and place racks', body: 'Fleet → order GPU servers. Sites → hall editor → place racks, cooling and PDUs, then install the servers.', screen: 'fleet', done: halls.some((h) => h.racks.some((r) => r.servers > 0)) },
    { title: 'Collect data', body: 'Lab → Data. Buy or scrape a dataset. Models are only as good as the tokens you feed them.', screen: 'lab', done: Object.keys(w.datasets ?? {}).length > 0 || mine.length > 0 || w.runs.length > 0 },
    { title: 'Train a model', body: 'Lab → Design. Pick From scratch, or Fine-tune / Pre-train an open model on your data. Check "What you\'ll get", then start.', screen: 'lab', done: w.runs.length > 0 || mine.length > 0 },
    { title: 'Launch and deploy it', body: 'When training ends, launch the model and give it servers to run on. No servers, no income.', screen: 'lab', done: mine.some((m) => m.releasedByPlayer) && w.deployments.length > 0 },
    { title: 'Package it as a product', body: 'Store → New product: a chat app or an API with Free, Plus and Pro plans.', screen: 'store', done: w.products.length > 0 },
    { title: 'Watch usage and fix bottlenecks', body: 'Store → your API shows traffic against capacity. Over 100% means rejected requests: add servers.', screen: 'store', done: w.products.some((p) => p.api && p.history.length > 7) || w.products.some((p) => p.history.length > 14) },
    { title: 'Grow: research, hire, outrun rivals', body: 'R&D unlocks better chips and training. Team hires managers to run things for you. Rankings shows who to beat.', screen: 'research', done: Object.keys(w.research.levels ?? {}).length > 3 }
  ]
  const n = steps.filter((s) => s.done).length
  if (n === steps.length) return null
  const next = steps.find((s) => !s.done)!
  return (
    <section className="start-card" style={{ ['--p' as string]: n / steps.length }} aria-label="Getting started">
      <div className="row" style={{ justifyContent: 'space-between', gap: 12 }}>
        <div><div className="eyebrow">Getting started · {n} of {steps.length}</div><h3>{next.title}</h3></div>
        <div className="row"><button className="btn pri sm" onClick={() => go(next.screen)}>Take me there</button><button className="btn ghost sm" aria-label={open ? 'Hide checklist' : 'Show checklist'} onClick={() => setOpen(!open)}>{open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}</button></div>
      </div>
      <p className="dim" style={{ fontSize: 13.5, maxWidth: 70 + 'ch' }}>{next.body}</p>
      {open && <ol className="start-steps">
        {steps.map((s, i) => <li key={i}><button className={s.done ? 'done' : s === next ? 'now' : ''} onClick={() => go(s.screen)}><span className="tick">{s.done && <Check size={12} strokeWidth={3} />}</span>{s.title}</button></li>)}
      </ol>}
    </section>
  )
}
