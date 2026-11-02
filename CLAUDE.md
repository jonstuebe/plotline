# Plotline

A daily word game: guess today's famous book and today's famous movie from summaries exactly five words long. The app is styled as a stock iOS 26 app: SF Pro, Apple's system colours (nudged to pass WCAG AA), and Liquid Glass for the floating controls.

## How the game works

- Two modes, Books and Movies, switched with the tab bar. Each has one mystery title per day, the same for everyone, and its own Puzzle numbers and stats. New ones arrive at midnight, local time.
- The player starts with one clue: a five-word summary that's deliberately unhelpful.
- The player types a title and presses Guess. Suggestions appear while they type, and a leading "The" is optional.
- Each wrong guess reveals the next, more helpful clue. The player can Skip to the next clue instead, but a skip uses up a try. On the last clue the button reads Give Up.
- There are six tries. Clues get easier as they go: the fifth usually names the characters and the sixth names the author or director.
- Guessing within six tries **solves** it. Missing all six shows the answer as "Out of clues".

## Sharing

When the game ends, Share posts the result without giving away the book:

```
Plotline #12 3/6

📖 🟥⬜🟩⬛⬛⬛

plotline.jonstuebe.com
```

A Movie shares as `Plotline Movies #3 2/6` with 🎬 in place of 📖.

🟥 is a wrong guess, ⬜ a skip, 🟩 the correct guess, and ⬛ a clue the player never needed.

## Agent skills

### Issue tracker

Issues are tracked in GitHub Issues on `jonstuebe/plotline` via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

The default five-label vocabulary (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `GLOSSARY.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.
