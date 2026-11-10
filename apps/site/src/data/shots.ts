/** Screenshots captured from the running game (1440×900), looked up by name. */
import type { ImageMetadata } from 'astro';

const files = import.meta.glob<{ default: ImageMetadata }>('../assets/shots/*.jpg', { eager: true });
const byName: Record<string, ImageMetadata> = {};
for (const [path, mod] of Object.entries(files)) byName[path.split('/').pop()!.replace('.jpg', '')] = mod.default;

export function shot(name: string): ImageMetadata {
  const img = byName[name];
  if (!img) throw new Error(`No screenshot called "${name}" in src/assets/shots`);
  return img;
}
