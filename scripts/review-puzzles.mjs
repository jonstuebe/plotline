// Serves a local page for reading every Puzzle by date and approving it or asking for changes.
// Usage: npm run review [-- --port 5180]
// The page switches between Books and Movies. Verdicts go to worker/puzzle-reviews.json (Books) or
// worker/movie-reviews.json (Movies), keyed by Puzzle id. Each one remembers the Puzzle it judged,
// so editing a Puzzle afterwards puts it back up for review.
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { MODES, modeFor } from './modes.mjs';
import { clueProblems } from './puzzle-checks.mjs';

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

// Read fresh on every request, so edits to the Puzzle files show up on reload.
async function snapshot(mode) {
  const puzzles = await readJson(mode.puzzles, []);
  const reviews = await readJson(mode.reviews, {});
  return {
    launchDate: mode.launchDate,
    creator: mode.creator,
    modes: Object.fromEntries(Object.entries(MODES).map(([key, m]) => [key, m.label])),
    puzzles: puzzles.map((p) => ({ ...p, fingerprint: fingerprint(p), problems: clueProblems(p, mode.creator) })),
    reviews,
  };
}

async function saveReview(mode, id, body) {
  const puzzles = await readJson(mode.puzzles, []);
  const puzzle = puzzles.find((p) => p.id === id);
  if (!puzzle) return 404;
  const reviews = await readJson(mode.reviews, {});
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
  await writeFile(mode.reviews, `${JSON.stringify(sorted, null, 2)}\n`);
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
    const { pathname, searchParams } = new URL(req.url, 'http://localhost');
    if (req.method === 'GET' && pathname === '/') return send(200, await readFile(PAGE), 'text/html; charset=utf-8');
    // ?mode=book|movie picks the Puzzle list; Books when it's left off.
    const mode = modeFor(searchParams.get('mode') ?? 'book');
    if (pathname.startsWith('/api/') && !mode) return send(400, { error: 'No such mode' });
    if (req.method === 'GET' && pathname === '/api/puzzles') return send(200, await snapshot(mode));
    const font = FONT_FILE.exec(pathname);
    if (req.method === 'GET' && font) return send(200, await readFile(new URL(`${font[1]}/${font[2]}`, FONTS)), TYPES[font[2].split('.').at(-1)]);
    const review = REVIEW_ROUTE.exec(pathname);
    if (req.method === 'PUT' && review) {
      const status = await saveReview(mode, Number(review[1]), await readBody(req));
      return status === 200 ? send(200, await snapshot(mode)) : send(status, { error: status === 404 ? 'No such Puzzle' : 'Bad review' });
    }
    send(404, { error: 'Not found' });
  } catch (err) {
    console.error(err);
    send(500, { error: String(err.message ?? err) });
  }
});

server.listen(port, '127.0.0.1', () => {
  console.log(`Puzzle review desk: http://localhost:${port}`);
  console.log('Verdicts are saved to worker/puzzle-reviews.json (Books) and worker/movie-reviews.json (Movies).');
});
