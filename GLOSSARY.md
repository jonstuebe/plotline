# Plotline

A daily book and movie game: every player gets the same mystery Book and the same mystery Movie each day, and guesses each from five-word Clues.

## Language

**Mode**:
One of the two daily games, Books or Movies, each with its own Puzzles, Puzzle numbers and stats. The player switches between them with the tab bar.
_Avoid_: Category, game type

**Puzzle**:
One mode's daily challenge that every player shares: one Book or Movie and its six Clues.
_Avoid_: Round, level, daily

**Book**:
The famous work a Book Puzzle asks for, with its title, author, publication date and any aliases.
_Avoid_: Answer, solution

**Movie**:
The famous film a Movie Puzzle asks for, with its title, director, release year and any aliases. It is stored in the same shape as a Book, with the director in `author`.
_Avoid_: Film, answer

**Puzzle number**:
The position of a Puzzle counted from its mode's Launch date, where the Launch date's Puzzle is #1. Books and Movies count separately.
_Avoid_: Day number, puzzle id

**Launch date**:
The local calendar date on which a mode's Puzzle #1 is played: one for Books, one for Movies.

**Clue**:
A summary of the Book or Movie exactly five words long. The six run from deliberately unhelpful to naming the author or director.
_Avoid_: Hint, summary

**Guess**:
A title the player submits. A wrong one reveals the next Clue.

**Skip**:
Revealing the next Clue without guessing. It uses up a try, like a wrong Guess.
_Avoid_: Pass

**Try**:
One Guess or Skip. A Puzzle allows six, one per Clue.
_Avoid_: Turn, attempt

**Suggestions**:
Titles offered while the player types, from a fixed list per mode that mixes every Book (or Movie) with decoys.
_Avoid_: Autocomplete

**Alias**:
Another title that also counts as the Book, such as "1984" for "Nineteen Eighty-Four".

**Solved**:
The Book or Movie was guessed within six tries.
_Avoid_: Won, checked out

**Missed**:
All six tries were used without guessing it. The reveal says "Out of clues".
_Avoid_: Lost, failed, overdue
