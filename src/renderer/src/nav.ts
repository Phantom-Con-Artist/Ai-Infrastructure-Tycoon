/** Six hubs instead of thirteen tabs. Each hub owns a few screens, shown as pills at the top. */
export type Screen = 'overview' | 'sites' | 'fleet' | 'silicon' | 'lab' | 'contracts' | 'research' | 'finance' | 'rankings' | 'studio' | 'web' | 'store' | 'team' | 'paper'
export type Hub = 'hq' | 'build' | 'make' | 'sell' | 'company' | 'world'

export const HUBS: Record<Hub, { label: string; blurb: string; screens: Screen[] }> = {
  hq: { label: 'HQ', blurb: 'What needs you today', screens: ['overview'] },
  build: { label: 'Build', blurb: 'Land, halls, servers and chips', screens: ['sites', 'fleet', 'silicon'] },
  make: { label: 'Make', blurb: 'Models and research', screens: ['lab', 'research'] },
  sell: { label: 'Sell', blurb: 'Products, deals and the web', screens: ['store', 'contracts', 'web'] },
  company: { label: 'Company', blurb: 'People and money', screens: ['team', 'finance'] },
  world: { label: 'World', blurb: 'Rivals, press and the paper', screens: ['rankings', 'studio', 'paper'] }
}
export const HUB_ORDER: Hub[] = ['hq', 'build', 'make', 'sell', 'company', 'world']
export const SCREEN_LABEL: Record<Screen, string> = {
  overview: 'HQ', sites: 'Sites', fleet: 'Fleet', silicon: 'Silicon', lab: 'Lab', research: 'R&D', store: 'Store', contracts: 'Deals',
  web: 'Web', team: 'Team', finance: 'Books', rankings: 'Ranks', studio: 'Studio', paper: 'Newspaper'
}
export function hubOf(s: Screen): Hub {
  for (const h of HUB_ORDER) if (HUBS[h].screens.includes(s)) return h
  return 'hq'
}
