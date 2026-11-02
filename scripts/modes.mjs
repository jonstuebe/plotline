// The two daily modes, and where each keeps its Puzzles, review verdicts and Suggestions.
// Shared by npm run puzzle and npm run review.
import { LAUNCH_DATE, MOVIE_LAUNCH_DATE } from '../worker/puzzles.ts';

const file = (path) => new URL(`../${path}`, import.meta.url);

export const MODES = {
  book: {
    label: 'Books',
    creator: 'author',
    launchDate: LAUNCH_DATE,
    puzzles: file('worker/puzzles.json'),
    reviews: file('worker/puzzle-reviews.json'),
    titles: file('src/lib/titles.json'),
  },
  // Movie Puzzles keep the Puzzle shape: `author` holds the director.
  movie: {
    label: 'Movies',
    creator: 'director',
    launchDate: MOVIE_LAUNCH_DATE,
    puzzles: file('worker/movies.json'),
    reviews: file('worker/movie-reviews.json'),
    titles: file('src/lib/movie-titles.json'),
  },
};

/** The mode for a name, or null if there's no such mode. */
export const modeFor = (name) => (Object.hasOwn(MODES, name) ? MODES[name] : null);

/** One Puzzle per line, as the shipped JSON files are written. */
export const puzzlesJson = (puzzles) => `[\n${puzzles.map((p) => `  ${JSON.stringify(p)}`).join(',\n')}\n]\n`;
export const titlesJson = (titles) => `[\n${titles.map((t) => `  ${JSON.stringify(t)}`).join(',\n')}\n]\n`;
