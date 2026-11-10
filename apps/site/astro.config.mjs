// @ts-check
import { defineConfig } from 'astro/config';

// Static site for Cloudflare Pages. Set SITE_URL in the Pages project once the domain is known.
export default defineConfig({
  site: process.env.SITE_URL ?? 'https://ai-infrastructure-tycoon.pages.dev',
});
