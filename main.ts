// Leonida Ledger — gta6-trophy-guide-01 entry program (Node 22, standard library only).
// The guide is plain static files in app/ (index.html + app.js + style.css + data/),
// served by any static server with app/ at its root, fully offline. This program
// hands it in: it copies app/ and screenshots/ beside this file to /output and
// writes /output/dossier.json with the vendored make.fun library, exactly as the
// kit's starter does. vendor/makefun-frontend.ts stays byte-identical to the kit.
// Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

// Honest audit counts, computed from the guide's own data files — the same
// numbers the app shows in its audit strip, so the dossier and the screenshots agree.
export function computeAuditCounts(appDir) {
  const trophies = JSON.parse(readFileSync(join(appDir, 'data', 'trophies.json'), 'utf8')).trophies;
  const sources = JSON.parse(readFileSync(join(appDir, 'data', 'sources.json'), 'utf8')).sources;
  const steps = trophies.flatMap((t) => t.steps);
  const backed = steps.filter((s) => s.s.length >= 2).length;
  const chars = steps.reduce((n, s) => n + s.t.length, 0);
  const claimsPerSource = new Map(sources.map((s) => [s.n, 0]));
  for (const s of steps) for (const n of s.s) claimsPerSource.set(n, (claimsPerSource.get(n) ?? 0) + 1);
  return {
    trophies: trophies.length,
    grades: {
      platinum: trophies.filter((t) => t.grade === 'platinum').length,
      gold: trophies.filter((t) => t.grade === 'gold').length,
      silver: trophies.filter((t) => t.grade === 'silver').length,
      bronze: trophies.filter((t) => t.grade === 'bronze').length,
    },
    hidden: trophies.filter((t) => t.hidden).length,
    missable: trophies.filter((t) => t.missable).length,
    claims: steps.length,
    backedByTwo: backed,
    guideChars: chars,
    sources: sources.length,
    claimsPerSource: Object.fromEntries(claimsPerSource),
  };
}

// Copy the entry's files into the output directory the grader reads.
export function copyEntryFiles(here, out) {
  mkdirSync(out, { recursive: true });
  cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });
  mkdirSync(join(out, 'screenshots'), { recursive: true });
  if (existsSync(join(here, 'screenshots'))) {
    cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
  }
}

// Build the dossier the judge reads, with the gate's own caps.
export function writeDossier(out) {
  writeFileSync(
    join(out, 'dossier.json'),
    buildDossier(out, { text_max_bytes: 163840, screenshots: { max: 4, max_bytes: 262144 }, app_max_files: 993, app_max_bytes: 50331648 }),
  );
}

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
const audit = computeAuditCounts(join(here, 'app'));
if (audit.trophies !== 55 || audit.grades.platinum !== 1 || audit.grades.gold !== 2 || audit.grades.silver !== 6 || audit.grades.bronze !== 46) {
  throw new Error(`trophy list is not the official 55 (1P/2G/6S/46B): got ${JSON.stringify(audit.grades)}`);
}
if (audit.claims === 0 || audit.backedByTwo === 0) {
  throw new Error('no cited guide steps found in the trophy data');
}
console.log(`Leonida Ledger: ${audit.trophies} trophies, ${audit.claims} cited steps (${audit.backedByTwo} backed by 2+ sources), ${audit.guideChars} guide chars, ${audit.sources} sources`);
copyEntryFiles(here, out);
writeDossier(out);
console.log(`dossier written to ${out}/dossier.json`);
