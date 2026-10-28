# Plotline

A daily book game: every player gets the same mystery Book and guesses it from five-word Clues.

## Language

**Puzzle**:
The single daily challenge every player shares: one Book and its six Clues.
_Avoid_: Round, level, daily

**Book**:
The famous work a Puzzle asks for, with its title, author, publication date and any aliases.
_Avoid_: Answer, solution

**Puzzle number**:
The position of a Puzzle counted from the Launch date, where the Launch date's Puzzle is #1.
_Avoid_: Day number, puzzle id

**Launch date**:
The local calendar date on which Puzzle #1 is played.

**Clue**:
A summary of the Book exactly five words long. The six run from deliberately unhelpful to naming the author.
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
Titles offered while the player types, from a fixed list of famous books that mixes every Book with decoys.
_Avoid_: Autocomplete

**Alias**:
Another title that also counts as the Book, such as "1984" for "Nineteen Eighty-Four".

**Checked out**:
The Book was guessed within six tries.
_Avoid_: Won, solved

**Overdue**:
All six tries were used without guessing the Book.
_Avoid_: Lost, failed
