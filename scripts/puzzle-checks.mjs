// The Clue rules every Puzzle must pass, shared by npm run puzzle and npm run review.
export const CLUES = 6;
export const WORDS = 5;

// Kept in step with normalizeTitle in src/lib/titles.ts.
export const normalize = (raw) =>
  raw
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[’'.]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/^(the|a|an) /, '');

/** What's wrong with a Book's six Clues, one line per problem. */
export function clueProblems({ title, author, clues }) {
  const problems = [];
  clues.forEach((clue, i) => {
    const count = String(clue).trim().split(/\s+/).length;
    if (count !== WORDS) problems.push(`Clue ${i + 1} has ${count} words: ${clue}`);
    if (i < 4 && normalize(clue).includes(normalize(title))) problems.push(`Clue ${i + 1} gives the title away: ${clue}`);
  });
  const surname = normalize(author.split(' ').at(-1));
  if (!normalize(clues.at(-1)).includes(surname)) problems.push(`The last Clue should name the author (${author}).`);
  return problems;
}
