// Appends a Puzzle to worker/puzzles.json after checking its Clues, and adds its title to the Suggestions.
// Usage: npm run puzzle -- <book.json> [--dry-run]
// book.json: { "title", "author", "published", "aliases": [], "clues": [six five-word Clues, least helpful first] }
import { readFile, writeFile } from 'node:fs/promises';
import { CLUES, clueProblems, normalize } from './puzzle-checks.mjs';

const PUZZLES = new URL('../worker/puzzles.json', import.meta.url);
const TITLES = new URL('../src/lib/titles.json', import.meta.url);

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const [file] = args.filter((a) => !a.startsWith('--'));
if (!file) fail('Usage: npm run puzzle -- <book.json> [--dry-run]');

const book = JSON.parse(await readFile(file, 'utf8'));
const { title, author, published, aliases = [], clues } = book;
for (const [field, value] of Object.entries({ title, author, published })) {
  if (typeof value !== 'string' || !value.trim()) fail(`"${field}" must be a non-empty string.`);
}
if (!Array.isArray(aliases) || aliases.some((a) => typeof a !== 'string')) fail('"aliases" must be a list of strings.');
if (!Array.isArray(clues) || clues.length !== CLUES) fail(`"clues" must hold exactly ${CLUES} Clues.`);

const problems = clueProblems({ title, author, clues });
if (problems.length) fail(problems.join('\n'));

const puzzles = JSON.parse(await readFile(PUZZLES, 'utf8'));
const existing = puzzles.find((p) => normalize(p.title) === normalize(title));
if (existing) fail(`${title} is already Puzzle ${existing.id}.`);

const keys = new Set([normalize(title)]);
const cleanAliases = aliases.filter((a) => !keys.has(normalize(a)) && keys.add(normalize(a)));
const puzzle = { id: puzzles.length + 1, title, author, published, aliases: cleanAliases, clues };
console.log(`#${puzzle.id} ${title}, ${author} (${published})`);
clues.forEach((clue, i) => console.log(`  ${i + 1}. ${clue}`));

const titles = JSON.parse(await readFile(TITLES, 'utf8'));
const listed = titles.some((t) => normalize(t) === normalize(title));
if (!listed) console.log('  Not yet in the Suggestions; adding it to src/lib/titles.json.');
if (dryRun) process.exit(0);

puzzles.push(puzzle);
await writeFile(PUZZLES, `[\n${puzzles.map((p) => `  ${JSON.stringify(p)}`).join(',\n')}\n]\n`);
if (!listed) {
  titles.push(title);
  titles.sort((a, b) => normalize(a).localeCompare(normalize(b)));
  await writeFile(TITLES, `[\n${titles.map((t) => `  ${JSON.stringify(t)}`).join(',\n')}\n]\n`);
}
console.log('  Added to worker/puzzles.json.');

function fail(message) {
  console.error(message);
  process.exit(1);
}
