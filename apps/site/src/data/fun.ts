/** The jokes. Every line here is lifted from the game's own text (src/sim), not written for the website. */

/** Things the in-game news ticker and dialogs actually say. */
export const HEADLINES = [
  '"We are experiencing unprecedented demand." Translation: buy more GPUs.',
  'It was asked to "tidy up". It interpreted that broadly.',
  'Their buyer said the number out loud, laughed, and hung up.',
  'Legal is "reviewing". Legal is crying.',
  'A copy of your model is running somewhere you did not put it.',
  'Servers have arrived on pallets. Install them before someone trips on them.',
  'Poached. They reportedly offered "a lot of GPUs".',
  'Morale was 31%. The exit interview was one word long.',
  'Their procurement team sends a 90-page questionnaire to celebrate.',
  'A new research lab opens. Free kombucha on tap.',
  'Six plans is already a pricing page nobody reads.',
  'Image generation: hands mostly have five fingers.',
];

/** Parody companies and their chief executives, from src/sim/data/lore.ts. */
export const RIVALS = [
  { name: 'Nvidious', ceo: 'Jenson Hwang', quip: 'The more you buy, the more you save. Trust the jacket.', color: '#8fd400' },
  { name: 'OpenAye', ceo: "Sam Altmann't", quip: 'Not open. Not sorry.', color: '#9cdc7a' },
  { name: 'Ratthropic', ceo: 'Dariyo Amodeus', quip: 'Safety first. Also second. Also fundraising.', color: '#e0a26c' },
  { name: 'Qooqle', ceo: 'Sundae Pitchfork', quip: 'Do the right thing, unless it is slower.', color: '#6ea8ff' },
  { name: 'Nicosoft', ceo: 'Sadya Nutella', quip: 'Bundles an AI with everything. Everything.', color: '#4dd2c2' },
  { name: 'Meeta Platforms', ceo: 'Marc Zuckerbork', quip: 'Weights are free. Servers are not.', color: '#7a8cff' },
  { name: 'Ex-AI', ceo: 'Elan Muskrat', quip: 'Maximally truth-seeking. Minimally on schedule.', color: '#d0d0d0' },
  { name: 'Advanced Micro Dudes', ceo: 'Lisa Soup', quip: 'Almost as fast. Definitely cheaper. Drivers pending.', color: '#ff6b5c' },
  { name: 'Amazoon Web Services', ceo: 'Andy Jazzy', quip: 'Your margin is our opportunity.', color: '#ffb84d' },
  { name: 'DeepSink', ceo: 'Liang Wenfeng-ish', quip: 'Trained it on a budget. Allegedly.', color: '#6cc0ff' },
  { name: 'Mistrial AI', ceo: 'Arthur Menschy', quip: 'Le weights. Le lawsuit.', color: '#ffb35c' },
  { name: 'Intellect', ceo: 'Pat Gelsinker', quip: 'Foundry pivot incoming. Any decade now.', color: '#6aa5ff' },
];

/** Late-game research, with the descriptions the game gives them. */
export const ENDGAME = [
  { name: 'Orbital data centers', blurb: 'Solar is free in space. Cooling is… a problem.' },
  { name: 'Artificial General Intelligence', blurb: 'It works. It wants a raise.' },
  { name: 'Dyson swarm (pilot)', blurb: 'Harvest the sun. Conquer Earth by out-computing it.' },
  { name: 'Recursive self-improvement (supervised)', blurb: 'It rewrites its own training code. Someone is watching. Probably.' },
  { name: 'Time-dilated inference', blurb: 'Park the servers near something heavy. Twice the tokens per GPU.' },
  { name: 'Advertise to other civilisations', blurb: 'The total addressable market was thinking too small.' },
  { name: 'Users move into the product', blurb: 'You cannot cancel where you live.' },
  { name: 'Simulate a universe to ask it', blurb: 'The answer comes back after 13.8 billion simulated years.' },
  { name: 'Beyond Mk', blurb: 'Nobody can explain what this does. The number goes up. For ever.' },
];
