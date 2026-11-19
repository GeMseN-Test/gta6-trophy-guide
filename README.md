# GTA 6 Trophy Guide & Tracker — 55 trophies, 7-stage platinum roadmap

[![GTA 6 Trophy Guide](https://make.fun/badge/gta6-trophy-guide-01.svg)](https://make.fun/bounty/gta6-trophy-guide-01)
[![Guide](https://make.fun/badge/gta6-trophy-guide-01/GeMseN-Test/gta6-trophy-guide.svg)](https://make.fun/bounty/gta6-trophy-guide-01)
[![Rank](https://make.fun/badge/gta6-trophy-guide-01/GeMseN-Test/gta6-trophy-guide/rank.svg)](https://make.fun/bounty/gta6-trophy-guide-01)
[![Reward](https://make.fun/badge/gta6-trophy-guide-01/GeMseN-Test/gta6-trophy-guide/reward.svg)](https://make.fun/bounty/gta6-trophy-guide-01)

An offline web app that is the complete guide and tracker for all **55 PlayStation 5 trophies** in Grand Theft Auto VI — one playthrough, about 200 hours, difficulty 4/10. Open it in a desktop browser and it works with no internet connection.

## What it does

- **All 55 trophies** with their official name, official description, and grade: 1 platinum, 2 gold, 6 silver, 46 bronze.
- **Big progress card** at the top: how many you have (e.g. 13/55), the percentage, and counts per grade and per stage.
- **Checklist saved in your browser** — tick trophies off and your progress is still there when you come back.
- **Export and import progress** — back up your checklist as a file, or move it to another computer.
- **Filter by type** — story, collectible, combat, driving, money, exploration, or misc.
- **Spoiler settings** — story trophies stay hidden until you earn them, so the guide never spoils the story.
- **7-stage platinum roadmap** — one playthrough in 7 stages, from the opening chapters to cleanup, about 200 hours in total.
- **1 missable trophy, clearly flagged** — a red MISSABLE banner on Positive Mental Attitude (meditate at every spot across Leonida). Do it in Chapter 1 and keep a Chapter 1 save: there is no mission replay and no New Game+.
- **A guide for every trophy**, written in our own words, quoting the official description and citing PowerPyx and GTABase as sources.

## How to run it (offline)

```bash
node serve.ts
```

Then open <http://localhost:8080> in your desktop browser. No internet needed — everything is static files.

## How to build it

```bash
MAKEFUN_OUTPUT_DIR=out node main.ts
```

## Sources & honesty

- Trophy **names, descriptions, and grades** come from the official 55-trophy list (the list published at launch on 18 November 2026, as included in the competition kit and confirmed against PowerPyx and GTABase, which all report the same 55 names and grades).
- The **guides are written by us, in our own words**. They quote the official description of each trophy and cite PowerPyx ([GTA 6 Trophy Guide](https://www.powerpyx.com/gta-6-grand-theft-auto-vi-trophy-guide-roadmap/)) and GTABase ([GTA 6 Trophies](https://www.gtabase.com/articles/gta-6/gta-6-achievements-trophies-list-ps5-xbox-series)) as sources. Nothing in the guides is copied from those pages.
- **One missable trophy, verified from the official description and the guides:** Positive Mental Attitude — meditate at every spot across Leonida. PowerPyx and GTABase both flag it as the only trophy that may be missable: the first meditation spot is offered in Chapter 1 (at Jason's house and on Lucia's balcony) and is gone once Chapter 1 ends. Every other trophy can be finished in free roam after the story. We claim no other trophy as missable.
- Roadmap numbers (about 200 hours, difficulty 4/10, one playthrough, no mission replay, cheats disable trophies) follow PowerPyx's published roadmap.

## Bounty

Built for the [make.fun bounty "gta6-trophy-guide-01"](https://make.fun/bounty/gta6-trophy-guide-01) — "Build the best GTA 6 trophy guide". $250 prize pool, top 50.

Joined make.fun with referral code `5c2wyg2x`.

## License

MIT — see [LICENSE](LICENSE).
