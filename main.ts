// Neon Coast Cover Studio — a gta6-cover-art-01 entry (Node 22, standard library only). The app in app/ is a
// multi-panel GTA-style cover maker: it loads a person's own photos on their machine, crops one or several of
// them into poster panels, runs them through Vice City sunset and neon colour grades, letters a caption in
// Anton, and exports a PNG at 1080 x 1080, 1080 x 1350 or 1920 x 1080. This program hands the entry in: it
// copies app/ and screenshots/ from beside this file to /output and writes /output/dossier.json, the summary
// the judge reads, with the vendored make.fun library.
//
// Serve the app locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes the bytes; the others refuse an entry the
// scorer would refuse (more than 4 screenshots or one over 256 KiB; more than 993 files in app/ or 48 MiB of app
// files, in all, or a path under app/ over 1000 bytes: app/ counts beside /output's own 1000-entry cap, its
// screenshots/ and dossier.json).
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
    app_path_max_bytes: 1000,
  }),
);

// Neon Coast hand-in report: name what was handed in, so a local run shows the entry's shape — how many app
// files, how many screenshots, and where the dossier landed — before the scorer ever sees it.
const handedAppFiles = readdirSync(join(out, 'app'), { recursive: true }).length;
const handedShots = readdirSync(join(out, 'screenshots')).length;
console.log(`neon-coast-cover-studio: handed in ${handedAppFiles} app files and ${handedShots} screenshots; dossier at ${join(out, 'dossier.json')}`);
