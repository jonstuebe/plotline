import puzzlesData from './puzzles.json';
import moviesData from './movies.json';
import type { Puzzle } from '../src/lib/types';
import { LAUNCH_DATE, MOVIE_LAUNCH_DATE, isTodaySomewhere, parseDateKey, puzzleForDate } from './puzzles';

const PUZZLES = puzzlesData as Puzzle[];
const MOVIES = moviesData as Puzzle[];
/** `/api/puzzle/<date>` is the Book of the day; `/api/movie/<date>` is the Movie. */
const ROUTE = /^\/api\/(puzzle|movie)\/([^/]+)$/;

/** Serves `GET /api/puzzle/<YYYY-MM-DD>` and `/api/movie/<YYYY-MM-DD>` only while that date is today somewhere on Earth. */
export function handle(request: Request, now: number, puzzles: Puzzle[] = PUZZLES, movies: Puzzle[] = MOVIES): Response {
  const url = new URL(request.url);
  const match = ROUTE.exec(url.pathname);
  if (!match) return json({ error: 'Not found' }, 404);
  if (request.method !== 'GET' && request.method !== 'HEAD') return json({ error: 'Method not allowed' }, 405, { Allow: 'GET, HEAD' });

  const movie = match[1] === 'movie';
  const key = match[2];
  const ms = parseDateKey(key);
  if (ms === null) return json({ error: 'Expected a date like 2026-10-27' }, 400);
  if (!isTodaySomewhere(ms, now)) return json({ error: 'That date is not today anywhere' }, 404);

  const found = movie ? puzzleForDate(movies, key, MOVIE_LAUNCH_DATE) : puzzleForDate(puzzles, key, LAUNCH_DATE);
  if (!found) return json({ error: 'No Puzzle for that date' }, 404);
  // A date stays "today" for up to 50 hours; let edges and browsers keep it a while.
  return json(found, 200, { 'Cache-Control': 'public, max-age=3600' });
}

function json(body: unknown, status: number, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...(status === 200 ? {} : { 'Cache-Control': 'no-store' }), ...headers },
  });
}

export default {
  fetch(request: Request): Response {
    return handle(request, Date.now());
  },
};
