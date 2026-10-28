# Plotline

A daily word game: guess today's famous book from summaries exactly five words long.

## How the game works

- One mystery book per day, the same for everyone. A new book arrives at midnight, local time.
- The player starts with one clue: a five-word summary that's deliberately unhelpful.
- The player types a title and presses Guess. Suggestions appear while they type, and a leading "The" is optional.
- Each wrong guess reveals the next, more helpful clue. The player can skip to the next clue instead, but a skip uses up a try.
- There are six tries. Clues get easier as they go: the fifth usually names the characters and the sixth names the author.
- Guessing within six tries means the book is **checked out**. Missing all six means it's stamped **OVERDUE**.

## Sharing

When the game ends, Share posts the result without giving away the book:

```
Plotline #12 3/6

📖 🟥⬜🟩⬛⬛⬛

plotline.jonstuebe.com
```

🟥 is a wrong guess, ⬜ a skip, 🟩 the correct guess, and ⬛ a clue the player never needed.

## Agent skills

### Issue tracker

Issues are tracked in GitHub Issues on `jonstuebe/plotline` via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

The default five-label vocabulary (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `GLOSSARY.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.
