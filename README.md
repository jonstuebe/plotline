# Plotline

A daily word game: guess today's famous book from summaries exactly five words long. Each wrong guess, or skip, pulls a more helpful Clue off the shelf; six tries in all. Then a spoiler-free result like `Plotline #12 3/6` / `📖 🟥⬜🟩⬛⬛⬛`.

- One Puzzle per day, the same for everyone, chosen from the player's **local** date.
- A small Cloudflare Worker serves only today's Puzzle, so future books and their Clues can't be read from the page source (see [ADR 0001](docs/adr/0001-puzzles-served-by-worker.md)).
- One attempt per day. Progress mid-puzzle, results, streaks and stats live in `localStorage` (`plotline:v1`); today's Puzzle is cached in `plotline:puzzle`.
- Installable PWA. It needs the network once a day to fetch the Puzzle; after that, today's game plays offline.

## Develop

```sh
npm install
npm run dev          # http://localhost:5173, with the Worker API running in workerd
npm run build        # typecheck + production build into dist/client (site) and dist/plotline (Worker)
npm run preview      # serve the build, Worker included (service worker enabled)
```

Node 26 (`mise.toml`). The first `npm install` may ask you to approve native install scripts: `npm install-scripts approve workerd esbuild sharp`.

## Test

```sh
npm test             # Vitest: date keys, the Worker's date gate, puzzle fetch/cache, title matching,
                     # Suggestions, share text, storage and streaks, and every shipped Puzzle's Clues
npm run test:e2e     # Playwright: guessing, skipping, Suggestions, checked out and Overdue, offline,
                     # theming, axe accessibility
```

## Deploy

```sh
npm run deploy       # build, then wrangler deploy to https://plotline.jonstuebe.com
```

One Cloudflare Worker serves the static site and `GET /api/puzzle/<YYYY-MM-DD>`, which returns `{ number, puzzle }` only while that date is "today" somewhere on Earth (UTC−12 to UTC+14). Every other date gets a 404.

## Content

Puzzles live in `worker/puzzles.json` and never ship in the client bundle. Write a book as JSON:

```json
{
  "title": "Peter Pan",
  "author": "J.M. Barrie",
  "published": "1911",
  "aliases": ["Peter and Wendy"],
  "clues": ["Boy refuses to grow up.", "…", "…", "…", "Wendy, Tinker Bell, Captain Hook.", "J.M. Barrie’s fantasy novel, 1911."]
}
```

```sh
npm run puzzle -- book.json              # checks the Clues, then appends it
npm run puzzle -- book.json --dry-run    # just check it
```

The script refuses a Clue that isn't exactly five words, a title that shows up in the first four Clues, and a last Clue that doesn't name the author. It adds the title to the Suggestions (`src/lib/titles.json`) if it's missing. Then commit and `npm run deploy`. The build warns when fewer than 14 Puzzles are left after today.

- Puzzle number = days since `LAUNCH_DATE` in `worker/puzzles.ts` (Puzzle #1 on launch day). When the list runs out, players see "Back tomorrow"; it never loops.
- Clues run from deliberately unhelpful to giveaway: the fifth usually names the characters, the sixth the author.
- `aliases` are other titles that also count, like `1984`. Case, accents, punctuation and a leading "The"/"A"/"An" never matter, so don't list those variants.
- `src/lib/titles.json` is every title the Suggestions offer, answers and decoys alike. It ships to the client on purpose: it's the same every day, so it gives nothing away.
- Don't use Peter Pan: it's the example on the help card, and the unit tests refuse it.

## Structure

```
worker/
  index.ts           GET /api/puzzle/:date with the "today somewhere" gate
  puzzles.ts         launch date, puzzle number, date window
  puzzles.json       every Puzzle (server only)
src/
  lib/daily.ts       fetch today's Puzzle, cache it for offline play
  lib/puzzle.ts      local date key, DST-safe day maths, next midnight
  lib/game.ts        guessing, skipping, Clues shown, the answer check
  lib/titles.ts      title normalizing and Suggestions, from titles.json
  lib/share.ts       share text + Web Share API / clipboard fallback
  lib/storage.ts     versioned localStorage, streaks, stats
  lib/pwa.ts         service worker registration + update prompt
  components/        Game, Shelf, GuessCard, Result, modals, toasts
scripts/
  add-puzzle.mjs     npm run puzzle
  make-icons.mjs     PWA icons (npm run icons)
```
