import { describe, expect, it } from 'vitest';
import { handle } from '../../worker/index';
import { MOVIE_LAUNCH_DATE, parseDateKey } from '../../worker/puzzles';
import { puzzle } from './fixtures';

const PUZZLES = [puzzle({ id: 1 }), puzzle({ id: 2, title: 'Animal Farm', aliases: [] })];
const NOON = parseDateKey('2026-10-27')! + 12 * 3_600_000;
const get = (path: string, now = NOON, method = 'GET') => handle(new Request(`https://plotline.jonstuebe.com${path}`, { method }), now, PUZZLES);

describe('GET /api/puzzle/:date', () => {
  it('serves today’s Puzzle with its number', async () => {
    const res = get('/api/puzzle/2026-10-27');
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ number: 1, puzzle: PUZZLES[0] });
  });

  it('refuses tomorrow, so no one can read ahead', () => {
    expect(get('/api/puzzle/2026-10-29').status).toBe(404);
  });

  it('refuses a date that is over everywhere', () => {
    expect(get('/api/puzzle/2026-10-25').status).toBe(404);
  });

  it('serves tomorrow once it has begun in UTC+14', async () => {
    const res = get('/api/puzzle/2026-10-28', parseDateKey('2026-10-27')! + 11 * 3_600_000);
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({ number: 2 });
  });

  it('404s once the Puzzles run out', () => {
    expect(handle(new Request('https://x/api/puzzle/2026-10-27'), NOON, []).status).toBe(404);
  });

  it('400s on something that isn’t a date', () => {
    expect(get('/api/puzzle/soon').status).toBe(400);
  });

  it('405s on a write', () => {
    const res = get('/api/puzzle/2026-10-27', NOON, 'POST');
    expect(res.status).toBe(405);
    expect(res.headers.get('Allow')).toBe('GET, HEAD');
  });

  it('404s any other path', () => {
    expect(get('/api/answers').status).toBe(404);
  });

  it('lets a served Puzzle be cached, but never an error', () => {
    expect(get('/api/puzzle/2026-10-27').headers.get('Cache-Control')).toContain('max-age=3600');
    expect(get('/api/puzzle/2026-10-29').headers.get('Cache-Control')).toBe('no-store');
  });
});

describe('GET /api/movie/:date', () => {
  const MOVIES = [puzzle({ id: 1, title: 'Jaws', author: 'Steven Spielberg', aliases: [] }), puzzle({ id: 2, title: 'Alien', aliases: [] })];
  const LAUNCH_NOON = parseDateKey(MOVIE_LAUNCH_DATE)! + 12 * 3_600_000;
  const getMovie = (key: string, now = LAUNCH_NOON) => handle(new Request(`https://plotline.jonstuebe.com/api/movie/${key}`), now, PUZZLES, MOVIES);

  it('serves Movie #1 on the Movie launch date, counted apart from the Books', async () => {
    const res = getMovie(MOVIE_LAUNCH_DATE);
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ number: 1, puzzle: MOVIES[0] });
  });

  it('refuses a Movie days ahead', () => {
    const tomorrow = new Date(parseDateKey(MOVIE_LAUNCH_DATE)! + 2 * 86_400_000).toISOString().slice(0, 10);
    expect(getMovie(tomorrow).status).toBe(404);
  });

  it('has nothing before the Movie launch', () => {
    const before = new Date(parseDateKey(MOVIE_LAUNCH_DATE)! - 86_400_000).toISOString().slice(0, 10);
    expect(getMovie(before, LAUNCH_NOON - 86_400_000).status).toBe(404);
  });
});
