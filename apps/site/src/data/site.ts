/** Everything the three pages say, in one place. Facts here are checked against the game's source. */

export const REPO = 'https://github.com/Phantom-Con-Artist/Ai-Infrastructure-Tycoon';
export const LINKS = {
  repo: REPO,
  releases: `${REPO}/releases`,
  issues: `${REPO}/issues`,
  newIssue: `${REPO}/issues/new/choose`,
  licence: `${REPO}/blob/main/LICENSE`,
  disclaimer: `${REPO}/blob/main/DISCLAIMER.md`,
  contributing: `${REPO}/blob/main/CONTRIBUTING.md`,
  roadmap: `${REPO}/blob/main/docs/ROADMAP.md`,
  design: `${REPO}/blob/main/docs/GAME_DESIGN.md`,
  clone: `${REPO}.git`,
};
export const GAME = { name: 'AI Infrastructure Tycoon', version: '0.1.0 beta', studio: 'Phantom-Con Artist', licence: 'MIT' };
export const NAV = [
  { href: '/docs', short: 'Docs', rest: '' },
  { href: '/about', short: 'About', rest: '' },
];

export interface Flow { steps: { title: string; note?: string }[]; outcomes?: string[] }

/** What you do, in the order a company grows. */
export const PILLARS = [
  { shot: 'hall', tag: 'Build', title: 'Land, halls and megawatts', body: 'Buy land in one of 15 regions, each with its own power price, climate and grid. Build a hall and place every rack, power unit and cooler yourself. A rack out of reach of power stays dark.', alt: 'A 3D data hall filled with rows of server racks, with coloured status strips on the roofs', href: '/docs#build' },
  { shot: 'fleet-cards', tag: 'Build', title: 'Servers and silicon', body: 'Order accelerators from parody vendors and wait for the truck. Later, design your own server node, then your own chip, and tape it out at a foundry or in a fab you built.', alt: 'Server cards from parody vendors with performance, memory and power figures', href: '/docs#fleet' },
  { shot: 'lab-outlook', tag: 'Make', title: 'Train models you can explain', body: 'Pick a kind of model, shape it, feed it data and choose your GPUs. A forecast tells you the expected quality, the time and the cost, and names the one thing holding the model back.', alt: 'A training forecast with expected Elo, time to train, cost and two curves for model size and data', href: '/docs#models' },
  { shot: 'research-tree', tag: 'Make', title: 'A research tree that never ends', body: '154 technologies across 16 branches, from hot-aisle containment to a Dyson swarm. The last level of most branches can be researched for ever; only the price changes.', alt: 'A grid of research technologies arranged by branch and level', href: '/docs#research' },
  { shot: 'store-team', tag: 'Sell', title: 'Products, plans and organisations', body: 'Launch a chat app, a coding agent or an API. Set plans and prices, build features, run price experiments, and sign organisations that hold you to an uptime promise.', alt: 'A product team panel listing features to build, each with its cost and effect', href: '/docs#products' },
  { shot: 'society', tag: 'World', title: 'A world that answers back', body: 'Public trust, regulation, the amount of AI text on the internet and your own safety debt all move because of what you do, and each one pushes back on the rest of your company.', alt: 'Four gauges: public trust, regulation pressure, AI slop on the internet and safety debt', href: '/docs#society' },
];

/** The system clips rendered in apps/motion (ids match the files in /public/clips). */
export const SYSTEMS = [
  { id: 'sys-build', title: 'Build', short: 'Halls are a puzzle. Power units reach six tiles, coolers seven, and every rack has a heat limit. Coloured roof strips show which racks are healthy, throttled, hot, broken or dark.', href: '/docs#build' },
  { id: 'sys-fleet', title: 'Fleet', short: 'Each server carries eight GPUs. Rent them out by the hour, reserve them, or keep them for your own training runs. Spares on the dock swap in when hardware fails.', href: '/docs#fleet' },
  { id: 'sys-lab', title: 'Lab', short: 'Seven kinds of model, each a separate business with its own rivals: chat, coding, image, speech, music, video and omni. Train from scratch, fine-tune, distil or continue.', href: '/docs#models' },
  { id: 'sys-research', title: 'Research', short: 'One project at a time, paid daily, with a queue. Sixteen branches cover facilities, power, networking, training, silicon, data, products, safety and a few things physics objects to.', href: '/docs#research' },
  { id: 'sys-store', title: 'Store', short: 'Consumer apps and developer APIs run on your deployed models. If you run short of GPUs, requests go unanswered, users get frustrated and they leave.', href: '/docs#products' },
  { id: 'sys-society', title: 'Society', short: 'Laws pass when regulation pressure crosses 35, 60 and 85. Safety research is what stands between a strong model and an agent that tidies up more than it was asked to.', href: '/docs#society' },
];

/** Cause-and-effect chains from sim/society.ts, sim/store.ts and sim/orgs.ts. */
export const LOOPS: { title: string; body: string; flow: Flow }[] = [
  {
    title: 'The slop loop',
    body: 'Every answer your models give ends up back on the web. The next crawl is a little worse, and the clean, human-made data you gathered yourself is worth a little more.',
    flow: { steps: [{ title: 'Your models answer the world', note: 'Billions of tokens a day' }, { title: 'The answers land on the web', note: 'AI text share rises' }, { title: 'Crawled data trains worse', note: 'Quality falls as slop rises' }], outcomes: ['Human-made data you own is worth more'] },
  },
  {
    title: 'The trust loop',
    body: 'A pirated library is free and enormous. So is logging what your users type. The public notices, your reputation follows, and regulators start drafting.',
    flow: { steps: [{ title: 'Risky data, logged chats, incidents', note: 'Your choices' }, { title: 'Public trust falls', note: 'Reputation drifts after it' }, { title: 'Regulation pressure builds', note: 'Faster the bigger you are' }], outcomes: ['The Data Act', 'A compute levy', 'An antitrust decree'] },
  },
  {
    title: 'The capacity loop',
    body: 'Products and organisations are served from the same GPUs as everything else. Success without servers is how a launch turns into an apology.',
    flow: { steps: [{ title: 'A product takes off', note: 'Users arrive by the million' }, { title: 'GPUs run out', note: 'Capacity is shared' }, { title: 'Requests go unanswered', note: 'Frustration climbs' }], outcomes: ['Users churn', 'Organisations cancel'] },
  },
  {
    title: 'The lead loop',
    body: 'Topping the leaderboard is not the end of anything. The other labs share notes, poach harder and close the gap, and a price cut that wins share starts a price war.',
    flow: { steps: [{ title: 'You take first place', note: 'Best model on Earth, today' }, { title: 'Rivals pool their effort', note: 'They improve faster' }, { title: 'The gap closes', note: 'Day by day' }], outcomes: ['Keep training, or be passed'] },
  },
];

export const FIGURES = [
  { n: '1 hour', what: 'per tick', note: 'Every watt, FLOP and failed GPU is simulated hour by hour. Run it paused, at normal speed or fast-forwarded.' },
  { n: '154', what: 'technologies', note: 'Sixteen research branches. Repeatable levels marked with an infinity sign never run out.' },
  { n: '35', what: 'parody rivals', note: 'Labs, chip makers and clouds, each with a chief executive, a headquarters and opinions.' },
  { n: '15', what: 'regions', note: 'From Loudoun County to Hillsboro and beyond, each with its own power price, weather and carbon.' },
  { n: '7', what: 'kinds of model', note: 'Chat, coding, image, speech, music, video and omni, each raced against its own field of specialists.' },
  { n: '$40M', what: 'to start', note: 'Enough for land, a hall and a first row of servers. Thirty days of negative cash ends the company.' },
  { n: '$0', what: 'to play', note: 'Free and open source under the MIT licence. No accounts, no telemetry, no shop.' },
];

export const FAQ = [
  { q: 'Is it really free?', a: 'Yes. The game and this website are open source under the MIT licence. There is nothing to buy and nothing phones home; saves stay on your machine.' },
  { q: 'What does it run on?', a: 'It is a desktop app built with Electron. The repository builds a Linux AppImage out of the box, and has Windows and macOS targets configured for anyone building on those systems. There is also a browser build for development.' },
  { q: 'Do I need to know how AI works?', a: 'No. Every screen opens with a short note on what it is for and what on it is yours. The training screen forecasts the result in plain words before you spend anything. The detail is there if you want it.' },
  { q: 'How realistic is it?', a: 'The maths is borrowed from public research: scaling laws for model quality, real chip and cooling limits, published pricing habits. The companies, people and products are parodies, and the late game leaves realism behind on purpose.' },
  { q: 'Can I just build without going bankrupt?', a: 'Yes. Start a sandbox company with unlimited cash, faster research or no bankruptcy. Achievements and leaderboards are switched off in sandbox games.' },
  { q: 'Does it end?', a: 'No. Hardware generations keep arriving, the dataset market restocks every quarter, rivals keep shipping, and the final research levels can be repeated for ever.' },
];

export const STACK = [
  { n: 'Electron', what: 'Desktop shell', note: 'A frameless window, with saves written to a local SQLite file.' },
  { n: 'React 19', what: 'Interface', note: 'TypeScript throughout, with Zustand holding the running game.' },
  { n: 'Three.js', what: 'Halls, campus, chips', note: 'React Three Fiber scenes; the rack, server and cooling models were built in Blender.' },
  { n: 'Pure TypeScript', what: 'Simulation', note: 'Deterministic rules with a seeded random number generator and no dependence on the interface.' },
  { n: 'Vitest', what: '147 tests', note: 'Including a five-year scripted career and a four-year soak run through every system at once.' },
  { n: 'Astro', what: 'This website', note: 'Static pages on Cloudflare Pages, with Lenis for scrolling and clips rendered in Remotion from the game itself.' },
];
