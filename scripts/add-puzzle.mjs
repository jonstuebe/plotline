// Appends a Puzzle after checking its Clues, and adds its title to the Suggestions.
// Usage: npm run puzzle -- <puzzle.json> [--movie] [--dry-run]
// puzzle.json: { "title", "author", "published", "aliases": [], "clues": [six five-word Clues, least helpful first] }
// With --movie it goes to worker/movies.json, and "author" holds the director.
import { readFile, writeFile } from 'node:fs/promises';
import { MODES, puzzlesJson, titlesJson } from './modes.mjs';
import { CLUES, clueProblems, normalize } from './puzzle-checks.mjs';

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const mode = MODES[args.includes('--movie') ? 'movie' : 'book'];
const PUZZLES = mode.puzzles;
const TITLES = mode.titles;
const [file] = args.filter((a) => !a.startsWith('--'));
if (!file) fail('Usage: npm run puzzle -- <puzzle.json> [--movie] [--dry-run]');

const book = JSON.parse(await readFile(file, 'utf8'));
const { title, author, published, aliases = [], clues } = book;
for (const [field, value] of Object.entries({ title, author, published })) {
  if (typeof value !== 'string' || !value.trim()) fail(`"${field}" must be a non-empty string.`);
}
if (!Array.isArray(aliases) || aliases.some((a) => typeof a !== 'string')) fail('"aliases" must be a list of strings.');
if (!Array.isArray(clues) || clues.length !== CLUES) fail(`"clues" must hold exactly ${CLUES} Clues.`);

const problems = clueProblems({ title, author, clues }, mode.creator);
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
if (!listed) console.log(`  Not yet in the Suggestions; adding it to ${relative(TITLES)}.`);
if (dryRun) process.exit(0);

puzzles.push(puzzle);
await writeFile(PUZZLES, puzzlesJson(puzzles));
if (!listed) {
  titles.push(title);
  titles.sort((a, b) => normalize(a).localeCompare(normalize(b)));
  await writeFile(TITLES, titlesJson(titles));
}
console.log(`  Added to ${relative(PUZZLES)}.`);

function relative(url) {
  return url.pathname.slice(new URL('../', import.meta.url).pathname.length);
}

function fail(message) {
  console.error(message);
  process.exit(1);
}
