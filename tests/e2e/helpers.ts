import type { Page } from '@playwright/test';

/** A Puzzle the tests control, so the suite doesn't depend on today's date. */
export const TEST_PUZZLE = {
  id: 1,
  title: 'Nineteen Eighty-Four',
  author: 'George Orwell',
  published: '1949',
  aliases: ['1984'],
  clues: [
    'Man keeps a private diary.',
    'His job: rewriting old newspapers.',
    'Television watches you back. Always.',
    'Two plus two equals five.',
    'Winston Smith versus Big Brother.',
    'George Orwell’s final novel, 1949.',
  ],
};

/** The Movie the tests control. */
export const TEST_MOVIE = {
  id: 1,
  title: 'Jaws',
  author: 'Steven Spielberg',
  published: '1975',
  aliases: [],
  clues: [
    'Mayor prioritizes tourism over safety.',
    'Beach town has uninvited guest.',
    'Needs a much bigger boat.',
    'Amity Island, summer of panic.',
    'Brody, Hooper, and Quint hunt.',
    'Steven Spielberg’s 1975 shark thriller.',
  ],
};

/** Serves the test Book (and the test Movie) for any date, so the game is the same every run. */
export async function stubPuzzle(page: Page, number = 1, puzzle = TEST_PUZZLE): Promise<void> {
  await page.route('**/api/puzzle/*', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ number, puzzle }) }),
  );
  await page.route('**/api/movie/*', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ number: 1, puzzle: TEST_MOVIE }) }),
  );
}

/** Opens the game past the first-run help sheet. */
export async function openGame(page: Page): Promise<void> {
  await page.goto('/');
  const start = page.getByRole('button', { name: 'Start Playing' });
  if (await start.isVisible()) await start.click();
  await page.getByRole('list', { name: 'Clues' }).waitFor();
}

export const input = (page: Page) => page.getByRole('combobox', { name: 'Your guess' });

/** The card holding the Clue in play. */
export const current = (page: Page) => page.getByRole('region', { name: 'Current clue' });

/** Types a title and presses Guess. */
export async function guess(page: Page, title: string): Promise<void> {
  await input(page).fill(title);
  await page.getByRole('button', { name: 'Guess', exact: true }).click();
}

/** Skips the Clue in play; on the last Clue the button reads Give Up. */
export async function skip(page: Page): Promise<void> {
  await current(page).getByRole('button', { name: /^(Skip|Give Up)$/ }).click();
}

/** Dismisses the stats sheet that slides in after the finish. */
export async function closeStats(page: Page): Promise<void> {
  const dialog = page.getByRole('dialog', { name: 'Statistics' });
  await dialog.waitFor();
  await dialog.getByRole('button', { name: 'Close' }).click();
  await dialog.waitFor({ state: 'hidden' });
}
