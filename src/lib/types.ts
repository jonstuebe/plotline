/** One day's mystery Book, as the Worker hands it to the client. */
export interface Puzzle {
  id: number;
  /** The Book's title as shown on the reveal, e.g. "The Great Gatsby". */
  title: string;
  author: string;
  /** When it was published, as shown on the reveal: "1925", "8th century BC". */
  published: string;
  /** Other titles that also count as correct, e.g. "1984" for "Nineteen Eighty-Four". */
  aliases: string[];
  /** Six Clues, each exactly five words, from least to most helpful. */
  clues: string[];
}
