/**
 * One short strip at the top of every screen: what the screen is for, which things on it belong to the player,
 * and which belong to someone else. Hidden per screen once read; a small link brings it back.
 */
import { useState } from 'react'
import { CircleHelp, X } from 'lucide-react'
import type { Screen } from './nav'
import { useWorld } from './store'

interface GuideText { what: string; yours: string; theirs: string; next: string }
export const GUIDES: Record<Screen, GuideText> = {
  overview: { what: 'Your desk. It shows what needs you today and everything you are waiting on.', yours: 'Cash, valuation, the in-progress list and the inbox are all your company.', theirs: 'The leaderboard mixes your models with rivals\'; yours are highlighted.', next: 'Follow "Your path" for the next sensible move.' },
  sites: { what: 'Land and buildings. A site holds halls; a hall holds racks, power units and coolers.', yours: 'Every site and hall here is yours. Rack roofs are colour-coded: green healthy, amber throttled, red hot, pink broken, dark no power, grey empty.', theirs: 'Regions and their power prices belong to the world, not to you.', next: 'Buy land, build a hall, lay out a first row of racks, then order servers in Fleet.' },
  fleet: { what: 'Buy servers and decide what they do. Each server holds eight GPUs.', yours: '"On order", spares and anything tagged "your design" are yours.', theirs: 'Cards with a vendor logo are chips made by other companies; the Cloud tab rents other companies\' GPUs by the hour.', next: 'Order servers, install them from the hall\'s loading dock, then rent them out or train on them.' },
  silicon: { what: 'Design your own chips and have them manufactured.', yours: 'Designs, tape-outs and your fab are yours; finished chips appear in Fleet as "your design".', theirs: 'Foundries and lithography suppliers are other companies you pay.', next: 'Optional and expensive. Come here once servers are your biggest cost.' },
  lab: { what: 'Make AI models: choose a kind, shape it, feed it data, train it on your GPUs.', yours: 'Anything you train is yours, including models that start from a rival\'s published recipe. "Make data" datasets are yours too.', theirs: 'Recipes with a company logo and "open weights" bases were published by rivals. "Buy data" sells other people\'s datasets.', next: 'Follow steps 1 to 5 on the Design tab, then launch the finished model from "Your models".' },
  research: { what: 'Research unlocks everything else and makes what you have better. One project at a time, paid daily.', yours: 'The whole tree is yours to research. ∞ items can be repeated for ever.', theirs: 'Nothing here belongs to rivals; they research on their own.', next: 'Queue cheap first-level items in the branch you use most. Research costs money every day, so wait until you have income.' },
  store: { what: 'Apps and APIs built on your launched models, sold to the public.', yours: 'Every product, plan, feature and subscriber here is yours.', theirs: 'Rivals\' products are not listed; you feel them as people choosing them over you.', next: 'Launch a model in the Lab first, then create a product and keep enough servers deployed to answer its users.' },
  contracts: { what: 'Two kinds of deal: organisations buying seats on your models, and companies paying you to train their model.', yours: 'Signed deals and the income from them.', theirs: 'In contract training the finished model belongs to the customer, not to you. Offers expire if you ignore them.', next: 'Only sign what you have the GPUs to serve; unhappy customers leave and tell others.' },
  web: { what: 'A pretend internet: your website, the press and social media reacting to you.', yours: 'Your domains and your site.', theirs: 'News sites and social feeds are written by the world about everyone.', next: 'Optional. A good site nudges demand a little.' },
  team: { what: 'The people who work for you. Skill and morale change how well everything else runs.', yours: 'The Team tab is your staff. Labs are your research groups.', theirs: 'The Hiring tab lists candidates who do not work for you yet; the board is replaced every week.', next: 'Hire managers to automate a whole area once it bores you.' },
  finance: { what: 'Where the money comes from and goes, loans, and going public.', yours: 'All of it.', theirs: 'Lenders set the interest rate from your track record.', next: 'Watch "Net / day" in the top bar: negative for long means bankruptcy.' },
  rankings: { what: 'How you compare with everyone else, and how the world is reacting to the industry.', yours: 'Rows tagged "yours" or highlighted in green.', theirs: 'Every other row is a rival company, model or person.', next: 'Check the Society tab now and then: it explains why trust, regulation and data quality are moving.' },
  studio: { what: 'Make launch videos for your models and chips.', yours: 'The videos and the hype they create.', theirs: 'Nothing.', next: 'Optional. A keynote gives a new model a burst of attention.' },
  paper: { what: 'Back issues of the daily newspaper.', yours: 'Stories about your company.', theirs: 'Stories about rivals and the wider world.', next: 'Skim it after a long fast-forward.' }
}
const KEY = (s: Screen): string => 'guide-hidden:' + s
const readHidden = (s: Screen): boolean => { try { return localStorage.getItem(KEY(s)) === '1' } catch { return false } }

export function Guide({ screen }: { screen: Screen }) {
  const w = useWorld()
  const [, bump] = useState(0)
  const g = GUIDES[screen]
  const set = (hide: boolean): void => { try { if (hide) localStorage.setItem(KEY(screen), '1'); else localStorage.removeItem(KEY(screen)) } catch { /* private window: it just will not be remembered */ } bump((n) => n + 1) }
  if (readHidden(screen)) return <button className="guide-open" onClick={() => set(false)}><CircleHelp size={13} /> How this screen works</button>
  return (
    <aside className="guide" aria-label="How this screen works">
      <div className="guide-what"><b>{g.what}</b><span>{g.next}</span></div>
      <div className="guide-col"><span className="guide-k"><i style={{ background: w.logo.color }} />Yours</span><span>{g.yours}</span></div>
      <div className="guide-col"><span className="guide-k"><i className="other" />Not yours</span><span>{g.theirs}</span></div>
      <button className="icon" aria-label="Hide this guide" title="Hide" onClick={() => set(true)}><X size={14} /></button>
    </aside>
  )
}
