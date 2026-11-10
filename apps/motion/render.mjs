// Renders every composition to ../site/public/clips as an .mp4 plus a .webp poster.
// Usage: npm run render                    all clips and posters
//        npm run render -- sys-lab reel    only these
//        npm run render -- --posters       posters only (fast)
// Needs ffmpeg on the PATH for the posters.
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const out = fileURLToPath(new URL('../site/public/clips/', import.meta.url));
mkdirSync(out, { recursive: true });
const all = ['reel', 'sys-build', 'sys-fleet', 'sys-lab', 'sys-research', 'sys-store', 'sys-society'];
const args = process.argv.slice(2);
const postersOnly = args.includes('--posters');
const named = args.filter((a) => !a.startsWith('--'));
const ids = named.length ? named : all;
const remotion = (a) => execFileSync('npx', ['remotion', ...a], { stdio: 'inherit' });
// a frame late enough that counters have settled and captions are up
const POSTER_FRAME = 110;

for (const id of ids) {
  if (!postersOnly) remotion(['render', 'src/index.ts', id, `${out}${id}.mp4`, '--codec=h264', '--crf=26', '--pixel-format=yuv420p', '--muted', '--log=error']);
  const png = `${out}${id}.poster.png`;
  remotion(['still', 'src/index.ts', id, png, `--frame=${POSTER_FRAME}`, '--log=error']);
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', png, '-quality', '82', `${out}${id}.webp`], { stdio: 'inherit' });
  rmSync(png);
}
