[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank · Shiizuku/gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01/Shiizuku/gta6-cover-art-01/rank.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward · Shiizuku/gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01/Shiizuku/gta6-cover-art-01/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

# Neon Coast Cover Studio

A GTA-style cover maker for the make.fun bounty
[gta6-cover-art-01](https://make.fun/bounty/gta6-cover-art-01): your own
photos in, a multi-panel Vice City poster out. It runs entirely offline in a
desktop browser — photos are read on your machine and never uploaded.

## What it does

- **Your photos, your cast.** Load photos with the file picker (FileReader,
  nothing leaves the machine) or start from the two built-in samples.
- **Four poster layouts** — Hero + Three (one tall portrait beside three
  stacked panels), Poster Grid (3 × 2), Quad Grid (2 × 2) and Full Bleed —
  drawn on the pale backing, white gutters and stacked-panel composition of
  the classic covers.
- **A crop per panel.** Click a panel to select it, drag the photo inside
  it, scroll to zoom, or use the sliders; each panel keeps its own framing,
  so one photo can play several panels at different crops.
- **Five colour grades**, each a canvas gradient-map over the photo's own
  tones: Vice Sunset (pink-orange), Neon Nights (magenta-cyan), Golden
  Hour, Midnight Chrome, and Original.
- **The lettering.** A studio tag across the top, five optional heat stars,
  and your title in Anton — vendored under `app/fonts/` with its SIL Open
  Font License — filled with a sunset gradient over a deep-purple outline,
  above a letter-spaced subtitle.
- **Exports** as PNG at 1080 × 1080, 1080 × 1350 and 1920 × 1080, rendered
  through the exact same draw path as the live preview.

No Rockstar logo, artwork or fonts — the look is rebuilt from gradients,
type and composition, and the sample photos are free-to-use images made for
make.fun.

## Run it

```
node serve.ts          # then open http://localhost:8080
```

or serve the `app/` folder with any static file server. To hand the entry
in the way the grader does:

```
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

## Layout of the code

- `app/src/grades.js` — the gradient-map colour grades.
- `app/src/layouts.js` — the four panel layouts.
- `app/src/render.js` — the single cover renderer (panels, vignette, grain,
  lettering) shared by the preview and every export size.
- `app/src/main.js` — the editor: state, uploads, drag/zoom, exports, and
  the `?shot=` modes the screenshots above were captured with.
