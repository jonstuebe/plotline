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

/** Serves the test Puzzle for any date, so the game is the same every run. */
export async function stubPuzzle(page: Page, number = 1, puzzle = TEST_PUZZLE): Promise<void> {
  await page.route('**/api/puzzle/*', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ number, puzzle }) }),
  );
}

/** Opens the game past the first-run help dialog. */
export async function openGame(page: Page): Promise<void> {
  await page.goto('/');
  const start = page.getByRole('button', { name: 'Start reading' });
  if (await start.isVisible()) await start.click();
  await page.getByRole('list', { name: 'Clues' }).waitFor();
}

export const input = (page: Page) => page.getByRole('combobox', { name: 'Your guess' });

/** Types a title and presses Guess. */
export async function guess(page: Page, title: string): Promise<void> {
  await input(page).fill(title);
  await page.getByRole('button', { name: 'Guess', exact: true }).click();
}

export async function skip(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Pull the next clue off the shelf' }).click();
}

/** Dismisses the stats dialog that slides in after the finish. */
export async function closeStats(page: Page): Promise<void> {
  const dialog = page.getByRole('dialog', { name: 'Reading record' });
  await dialog.waitFor();
  await dialog.getByRole('button', { name: 'Close' }).click();
  await dialog.waitFor({ state: 'hidden' });
}
