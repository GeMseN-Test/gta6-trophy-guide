// Leonida Ledger — hands the GTA VI trophy guide in.
// Copies app/ and screenshots/ from beside this file to /output and writes
// /output/dossier.json with the vendored make.fun library, as the kit asks.
// Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// The audit line it prints is the same math the app shows live in its audit strip:
// every guide step cites sources, and every step is backed by two or more.

import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

// Count the honest audit numbers from the guide data alone: trophies, grades,
// hidden/missable/at-risk flags, cited steps (each step naming its sources),
// steps backed by two or more sources, and guide characters (step text plus
// each trophy's own-words guide summary). Pure function of the app folder.
export function computeAuditCounts(appDir: string) {
  const trophiesDoc = JSON.parse(readFileSync(join(appDir, 'data', 'trophies.json'), 'utf8'));
  const sourcesDoc = JSON.parse(readFileSync(join(appDir, 'data', 'sources.json'), 'utf8'));
  const trophies = trophiesDoc.trophies as any[];
  const sources = (Array.isArray(sourcesDoc) ? sourcesDoc : sourcesDoc.sources) as any[];
  const steps = trophies.flatMap((t: any) => t.steps ?? []);
  const byGrade = (g: string) => trophies.filter((t: any) => (t.grade ?? '').toLowerCase() === g).length;
  return {
    total: trophies.length,
    platinum: byGrade('platinum'),
    gold: byGrade('gold'),
    silver: byGrade('silver'),
    bronze: byGrade('bronze'),
    hidden: trophies.filter((t: any) => t.hidden).length,
    missable: trophies.filter((t: any) => t.missable).length,
    atRisk: trophies.filter((t: any) => t.atRisk).length,
    steps: steps.length,
    cited: steps.filter((s: any) => (s.s ?? []).length >= 1).length,
    backed2: steps.filter((s: any) => (s.s ?? []).length >= 2).length,
    guideChars: steps.reduce((n: number, s: any) => n + (s.t ?? '').length, 0)
      + trophies.reduce((n: number, t: any) => n + (t.guide ?? '').length, 0),
    sources: sources.length,
    disputes: (trophiesDoc.disputes ?? []).length,
    stages: (trophiesDoc.stages ?? []).length,
  };
}

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
const appDir = join(here, 'app');

const audit = computeAuditCounts(appDir);

// Guards: the entry is not worth handing in if its data is short or uncited.
if (audit.total !== 55) throw new Error(`expected 55 trophies, got ${audit.total}`);
if (audit.platinum !== 1 || audit.gold !== 2 || audit.silver !== 6 || audit.bronze !== 46) {
  throw new Error(`expected 1P/2G/6S/46B, got ${audit.platinum}P/${audit.gold}G/${audit.silver}S/${audit.bronze}B`);
}
if (audit.missable !== 1) throw new Error(`expected exactly 1 missable trophy, got ${audit.missable}`);
if (audit.cited === 0) throw new Error('no cited steps: every guide step must name its sources');
if (audit.cited !== audit.steps) throw new Error(`${audit.steps - audit.cited} steps cite no source`);
if (audit.backed2 !== audit.steps) throw new Error(`${audit.steps - audit.backed2} steps are backed by fewer than 2 sources`);

mkdirSync(out, { recursive: true });
cpSync(appDir, join(out, 'app'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });

const dossier = buildDossier(out, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
});
if (dossier.length > 1572864) {
  throw new Error(`dossier ${dossier.length} bytes exceeds the 1.5 MiB cap`);
}
writeFileSync(join(out, 'dossier.json'), dossier);

console.log(
  `audit: ${audit.total}/${audit.total} trophies, ${audit.platinum}P/${audit.gold}G/${audit.silver}S/${audit.bronze}B, ` +
  `${audit.hidden} PSN-hidden, ${audit.missable} possibly missable, ${audit.atRisk} at risk, ` +
  `${audit.cited} cited steps (${audit.backed2} backed by 2+), ${audit.guideChars} guide chars, ` +
  `${audit.sources} sources, ${audit.disputes} disputes, ${audit.stages} stages`,
);
console.log(`dossier written to ${join(out, 'dossier.json')} (${dossier.length} bytes)`);
