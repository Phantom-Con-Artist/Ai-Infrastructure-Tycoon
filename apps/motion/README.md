# Motion

Remotion compositions for the website. Every clip is cut from screenshots of the game in `public/shots/`;
nothing is mocked up.

```
npm install
npm run dev                       # Remotion Studio
npm run render                    # all clips and posters into ../site/public/clips
npm run render -- sys-lab reel    # only these
npm run render -- --posters       # posters only
```

Rendering needs `ffmpeg` on the PATH (for the WebP posters). The first render downloads a headless browser.

## Compositions

| Id | Size | Used for |
| --- | --- | --- |
| `reel` | 1280×720, 13.2 s | The film in the window frame at the top of the landing page. |
| `sys-*` | 1280×800, 6 s | One per system on the landing page: a slow push into one screen and a figure that counts up. |

`src/kit.tsx` holds the shared pieces: `Pan` (a screenshot drifting between two framings), `Rise` (a line of
type rising out of a mask), `Count`, `Plate` (the black caption card) and `Loop` (fades each end so a clip loops cleanly).
