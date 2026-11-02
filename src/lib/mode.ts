import { MOVIE_TITLES, TITLES, type Title } from './titles';

/** The two daily games: a Book and a Movie, each with its own Puzzles, numbers and stats. */
export type Mode = 'book' | 'movie';
export const MODES: Mode[] = ['book', 'movie'];

export interface ModeInfo {
  /** "Book", as on the tab and in "Today’s Book". */
  label: string;
  /** "book", in running text: "Name the book". */
  noun: string;
  /** Where the Worker serves the day’s Puzzle: `${api}/<YYYY-MM-DD>`. */
  api: string;
  /** Where the day’s Puzzle is cached for offline play. */
  cacheKey: string;
  /** Heads the share text’s result line. */
  emoji: string;
  /** Before the creator on the reveal: "Directed by …" for Movies. */
  byPrefix: string;
  titles: Title[];
}

export const MODE_INFO: Record<Mode, ModeInfo> = {
  book: { label: 'Book', noun: 'book', api: '/api/puzzle', cacheKey: 'plotline:puzzle', emoji: '📖', byPrefix: '', titles: TITLES },
  movie: { label: 'Movie', noun: 'movie', api: '/api/movie', cacheKey: 'plotline:movie', emoji: '🎬', byPrefix: 'Directed by ', titles: MOVIE_TITLES },
};

export const otherMode = (mode: Mode): Mode => (mode === 'book' ? 'movie' : 'book');
