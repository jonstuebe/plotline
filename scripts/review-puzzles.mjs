// Serves a local page for reading every Puzzle by date and approving it or asking for changes.
// Usage: npm run review [-- --port 5180]
// Verdicts go to worker/puzzle-reviews.json, keyed by Puzzle id. Each one remembers the Puzzle it judged,
// so editing a Puzzle afterwards puts it back up for review.
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { LAUNCH_DATE } from '../worker/puzzles.ts';
import { clueProblems } from './puzzle-checks.mjs';

const PUZZLES = new URL('../worker/puzzles.json', import.meta.url);
const REVIEWS = new URL('../worker/puzzle-reviews.json', import.meta.url);
const PAGE = new URL('./review.html', import.meta.url);
const FONTS = new URL('../node_modules/@fontsource/', import.meta.url);
const FONT_FILE = /^\/fonts\/(libre-baskerville|special-elite)\/([\w.-]+\.css|files\/[\w.-]+\.woff2?)$/;
const REVIEW_ROUTE = /^\/api\/reviews\/(\d+)$/;
const STATUSES = new Set(['approved', 'changes']);

const portArg = process.argv.indexOf('--port');
const port = portArg > -1 ? Number(process.argv[portArg + 1]) : 5180;

const fingerprint = ({ title, author, published, aliases, clues }) =>
  createHash('sha1').update(JSON.stringify({ title, author, published, aliases, clues })).digest('hex').slice(0, 12);

async function readJson(url, fallback) {
  try {
    return JSON.parse(await readFile(url, 'utf8'));
  } catch (err) {
    if (err.code === 'ENOENT') return fallback;
    throw err;
  }
}

// Read fresh on every request, so edits to puzzles.json show up on reload.
async function snapshot() {
  const puzzles = await readJson(PUZZLES, []);
  const reviews = await readJson(REVIEWS, {});
  return {
    launchDate: LAUNCH_DATE,
    puzzles: puzzles.map((p) => ({ ...p, fingerprint: fingerprint(p), problems: clueProblems(p) })),
    reviews,
  };
}

async function saveReview(id, body) {
  const puzzles = await readJson(PUZZLES, []);
  const puzzle = puzzles.find((p) => p.id === id);
  if (!puzzle) return 404;
  const reviews = await readJson(REVIEWS, {});
  if (body.status === 'pending') {
    delete reviews[id];
  } else if (STATUSES.has(body.status)) {
    const flagged = Array.isArray(body.flagged) ? [...new Set(body.flagged.filter((i) => Number.isInteger(i) && i >= 0 && i < puzzle.clues.length))].sort((a, b) => a - b) : [];
    const note = typeof body.note === 'string' ? body.note.trim() : '';
    if (body.status === 'changes' && !note && !flagged.length) return 400;
    reviews[id] = { status: body.status, title: puzzle.title, note, flagged, fingerprint: fingerprint(puzzle), updatedAt: new Date().toISOString() };
  } else {
    return 400;
  }
  const sorted = Object.fromEntries(Object.entries(reviews).sort(([a], [b]) => a - b));
  await writeFile(REVIEWS, `${JSON.stringify(sorted, null, 2)}\n`);
  return 200;
}

async function readBody(req) {
  let raw = '';
  for await (const chunk of req) raw += chunk;
  return JSON.parse(raw || '{}');
}

const TYPES = { css: 'text/css', woff: 'font/woff', woff2: 'font/woff2' };

const server = createServer(async (req, res) => {
  const send = (status, body, type = 'application/json; charset=utf-8') => {
    res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store' });
    res.end(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body));
  };
  try {
    const { pathname } = new URL(req.url, 'http://localhost');
    if (req.method === 'GET' && pathname === '/') return send(200, await readFile(PAGE), 'text/html; charset=utf-8');
    if (req.method === 'GET' && pathname === '/api/puzzles') return send(200, await snapshot());
    const font = FONT_FILE.exec(pathname);
    if (req.method === 'GET' && font) return send(200, await readFile(new URL(`${font[1]}/${font[2]}`, FONTS)), TYPES[font[2].split('.').at(-1)]);
    const review = REVIEW_ROUTE.exec(pathname);
    if (req.method === 'PUT' && review) {
      const status = await saveReview(Number(review[1]), await readBody(req));
      return status === 200 ? send(200, await snapshot()) : send(status, { error: status === 404 ? 'No such Puzzle' : 'Bad review' });
    }
    send(404, { error: 'Not found' });
  } catch (err) {
    console.error(err);
    send(500, { error: String(err.message ?? err) });
  }
});

server.listen(port, '127.0.0.1', () => {
  console.log(`Puzzle review desk: http://localhost:${port}`);
  console.log('Verdicts are saved to worker/puzzle-reviews.json.');
});
