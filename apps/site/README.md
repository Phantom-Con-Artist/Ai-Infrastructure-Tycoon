# Website

The public site for AI Infrastructure Tycoon: a landing page that introduces the game, the documentation and an
about page. Static Astro, styled after the game's own title screen (deep navy, one mint accent, Space Grotesk
and Inter). One stylesheet, one small script, no UI framework.

```
npm install
npm run dev        # http://localhost:4321
npm run build      # static site in ./dist
npm run preview
```

## Where things are

- `src/data/site.ts`: copy, links and figures. `src/data/fun.ts`: headlines, rivals and late-game research, all lifted from the game's own text.
- `src/pages/`: `index.astro` (landing), `docs.astro` (documentation), `about.astro`, `404.astro`.
- `src/assets/shots/`: screenshots of the game, optimised by Astro at build time.
- `public/clips/`: clips and posters rendered by `apps/motion`. Committed, so the site builds without Remotion.
- `src/styles/site.css`: the whole design system.
- `src/scripts/site.ts`: Lenis inertia scrolling, things rising in once, clips that play only while visible, and the header that hides on the way down.

## Deploying to Cloudflare Pages

Create a Pages project connected to the GitHub repository with these settings:

| Setting | Value |
| --- | --- |
| Root directory | `apps/site` |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Node version | 24 (read from `.node-version`) |
| Environment variable | `SITE_URL` = the site's public address, for canonical links and social cards |

Or deploy from a terminal: `npx wrangler pages deploy dist --project-name ai-infrastructure-tycoon`.

`public/_headers` sets long-lived caching for hashed assets and a week for clips.

## Accessibility and motion

Content is readable without JavaScript. With `prefers-reduced-motion`, inertia scrolling, the ticker and the
rise-in effects are switched off, tilted cards sit straight, and clips show their poster with controls.
