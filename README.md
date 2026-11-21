# Leonida Ledger — GTA VI Trophy Guide: 55/55 cited guides, 200 cited steps, 22,629 guide chars

[![GTA 6 Trophy Guide](https://make.fun/badge/gta6-trophy-guide-01.svg)](https://make.fun/bounty/gta6-trophy-guide-01)
[![Leonida Ledger](https://make.fun/badge/gta6-trophy-guide-01/GeMseN-Test/gta6-trophy-guide.svg)](https://make.fun/bounty/gta6-trophy-guide-01)
[![Rank](https://make.fun/badge/gta6-trophy-guide-01/GeMseN-Test/gta6-trophy-guide/rank.svg)](https://make.fun/bounty/gta6-trophy-guide-01)
[![Reward](https://make.fun/badge/gta6-trophy-guide-01/GeMseN-Test/gta6-trophy-guide/reward.svg)](https://make.fun/bounty/gta6-trophy-guide-01)

**Leonida Ledger** is an offline guide and tracker for all **55 PlayStation 5 trophies** of Grand Theft Auto VI — 1 platinum, 2 gold, 6 silver, 46 bronze, 28 hidden on PSN. Every guide is written for this entry, in our own words, and every step cites its sources by number.

## The numbers

- **55/55** official trophies with name, description and grade exactly as PlayStation publishes them
- **200 cited steps** — every single step backed by **2+ sources** (200/200)
- **22,629 guide chars** of own-words guidance
- **12 sources** read 2026-11-21 (PowerPyx, GTABase, PSNProfiles, Exophase, IGN, KeenGamer, GTA Wiki, Push Square, TrueTrophies, PlayStation)
- **22 counters** (meditations 18, stunts 250, shooting-range golds 42, areas 52, and 18 more)
- **3 disputes** shown both ways, with our call
- **1 possibly missable** trophy, **4 at risk**, **7-stage roadmap**, about 200 hours, difficulty 4/10

## How to use it

Open `app/index.html` in desktop Chrome (or run `node serve.ts` and open http://localhost:8091). No network needed — everything runs from its own files.

- **Tracker**: mark trophies earned; progress is saved in your browser and can be exported to a file and imported back. Filters by kind, grade, search, earned-only; sort by roadmap or id.
- **Spoiler shield**: on by default — hidden and unearned story trophies show as "Hidden trophy" until you earn them.
- **Roadmap**: 7 stages from Chapter 1 to the 100% checklist, each with its trophies and hours.
- **Missables**: one red-flagged trophy — Positive Mental Attitude. Do the Chapter 1 balcony meditation and keep a Chapter 1 save; there is no mission replay and no New Game+.
- **Sources**: every step carries numbered source refs like [2][9]; the Sources tab shows the source matrix (claims per source) and the honesty note.

## The one missable trophy

**Positive Mental Attitude** (id 28) — meditate at all 18 spots across Leonida. The first meditation, on the balcony at Jason's house, is only offered in Chapter 1: the morning after the mission Down to Earth, Lucia is in Jason's kitchen and mentions meditating. Follow her to the balcony and accept. Keep a Chapter 1 save. The last spot only opens after Coffee Break in Chapter 2, once you play as both characters.

## Sources & honesty

Names, descriptions and grades are PlayStation's own words. All guides and steps are written for this entry and cite their sources by number — no text is copied from any guide. Where sources disagree, the guide shows both versions (see the 3 disputes in the app): the Chapter 1 balcony meditation, the time to platinum (PowerPyx ~200 hours vs Push Square up to 300), and how many card sets 100% needs (3 for the trophy, 15 for the checklist). Read 2026-11-21.

## Build

`main.ts` copies `app/` and `screenshots/` to the output directory and writes `dossier.json` with `buildDossier` from `vendor/makefun-frontend.ts`. Run it with `MAKEFUN_OUTPUT_DIR=out node main.ts`. Dossier: 745,251 bytes, reproducible byte-for-byte across runs.
