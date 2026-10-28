# Puzzles are served one day at a time by the Worker; the title list ships with the client

The prototype inlined every Puzzle into the page, so anyone could view source and read every future Book and all its Clues. Instead `puzzles.json` lives in the Cloudflare Worker, which serves `GET /api/puzzle/<YYYY-MM-DD>` only for a date that is "today" somewhere on Earth (UTC−12 to UTC+14) and returns `{ number, puzzle }`. Players must be online once per day; the Puzzle they fetch is cached in `localStorage` so play in progress still works offline. This is the same arrangement as Chain and Close Call.

The title list behind the Suggestions (`src/lib/titles.json`) does ship with the client. Suggestions need it on every keystroke, offline included. It mixes every Book with decoys and is the same every day, so it reveals nothing about any Puzzle.

## Considered Options

- **Bundle every Puzzle:** leaks every future Book and grows the bundle without bound.
- **Loop the list, as the prototype did:** a looped Puzzle's Book is already public.
- **Check Guesses on the server and send Clues one at a time:** would hide today's Book and later Clues too, but costs offline play and a round-trip per try. Today's Puzzle reaching DevTools is accepted, as it is for Wordle.
- **KV, D1 or a Durable Object:** the data is read-only and keyed by date. Puzzles stay in git and publish with `npm run deploy`.

## Consequences

- The Puzzle number and Launch date live only on the server; the client asks for its local date.
- Clues still on the shelf are never put in the DOM, only bars sized to their words, so today's later Clues need DevTools' network tab, not a glance at the page.
- When the Puzzles run out the server returns 404 and the app shows "Back tomorrow". `npm run deploy` warns when fewer than 14 Puzzles remain.
- The prototype's `#p<n>` preview link is gone: the client can no longer see any Puzzle but today's. Use `npm run puzzle -- book.json --dry-run` to check a Book before adding it.
