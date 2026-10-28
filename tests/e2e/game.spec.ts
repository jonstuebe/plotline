import { expect, test, type Page } from '@playwright/test';
import { closeStats, guess, input, openGame, skip, stubPuzzle } from './helpers';

test.beforeEach(async ({ page }) => stubPuzzle(page));

const clues = (page: Page) => page.getByRole('list', { name: 'Clues' });
const revealed = (page: Page, n: number) => clues(page).getByRole('listitem').filter({ hasText: `Clue ${n}: ` });

test('shows the help dialog on a first visit, once', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('dialog', { name: 'How to play' })).toBeVisible();
  await page.getByRole('button', { name: 'Start reading' }).click();

  await page.reload();
  await expect(page.getByRole('dialog', { name: 'How to play' })).toBeHidden();
});

test('starts with one Clue off the shelf and five still on it', async ({ page }) => {
  await openGame(page);
  await expect(revealed(page, 1)).toContainText('Man keeps a private diary.');
  await expect(clues(page).getByText(/still on the shelf/)).toHaveCount(5);
  await expect(page.getByText('Try 1 of 6')).toBeVisible();
  // Hidden Clues aren't in the page at all.
  await expect(page.getByText('Winston Smith')).toHaveCount(0);
});

test('a wrong guess crosses it off and pulls the next Clue @mobile', async ({ page }) => {
  await openGame(page);
  await guess(page, 'Animal Farm');
  await expect(revealed(page, 2)).toContainText('rewriting old newspapers');
  await expect(page.getByRole('list', { name: 'Your guesses' })).toContainText('Animal Farm');
  await expect(page.getByText('Try 2 of 6')).toBeVisible();
  await expect(input(page)).toHaveValue('');
});

test('skipping pulls the next Clue and uses a try', async ({ page }) => {
  await openGame(page);
  await skip(page);
  await expect(revealed(page, 2)).toBeVisible();
  await expect(page.getByRole('list', { name: 'Your guesses' })).toContainText('skipped');
  await expect(page.getByText('Try 2 of 6')).toBeVisible();
});

test('refuses an empty or repeated guess without spending a try', async ({ page }) => {
  await openGame(page);
  await guess(page, '   ');
  await expect(page.getByText('Type a title, or skip to the next clue.')).toBeVisible();
  await guess(page, 'Dune');
  await guess(page, 'dune');
  await expect(page.getByText('You already guessed that one.')).toBeVisible();
  await expect(input(page)).toHaveValue('dune');
  await expect(page.getByText('Try 2 of 6')).toBeVisible();
});

test('suggests titles while typing, picked with the keyboard', async ({ page }) => {
  await openGame(page);
  await input(page).fill('animal');
  const listbox = page.getByRole('listbox', { name: 'Suggestions' });
  await expect(listbox.getByRole('option', { name: 'Animal Farm' })).toBeVisible();
  await input(page).press('ArrowDown');
  await input(page).press('Enter');
  await expect(input(page)).toHaveValue('Animal Farm');
  await expect(listbox).toBeHidden();
});

test('a suggestion can be tapped', async ({ page }) => {
  await openGame(page);
  await input(page).fill('nineteen');
  await page.getByRole('option', { name: 'Nineteen Eighty-Four' }).click();
  await expect(input(page)).toHaveValue('Nineteen Eighty-Four');
});

test('the right title checks the Book out, and Share gives nothing away', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await openGame(page);
  await guess(page, 'Brave New World');
  await skip(page);
  await guess(page, '1984');

  const result = page.getByRole('region', { name: 'Result' });
  await expect(result.getByRole('heading', { name: 'Nineteen Eighty-Four' })).toBeVisible();
  await expect(result).toContainText('George Orwell, 1949');
  await expect(result).toContainText('Checked out · Clue 3');
  await expect(clues(page).getByText(/still on the shelf/)).toHaveCount(0);
  await closeStats(page);

  await page.getByRole('button', { name: 'Share' }).click();
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  expect(copied).toBe('Plotline #1 3/6\n\n📖 🟥⬜🟩⬛⬛⬛\n\nplotline.jonstuebe.com');
});

test('a leading "The" is optional', async ({ page }) => {
  await page.unroute('**/api/puzzle/*');
  await stubPuzzle(page, 1, { id: 1, title: 'The Hobbit', author: 'J.R.R. Tolkien', published: '1937', aliases: [], clues: Array(6).fill('One two three four five.') });
  await openGame(page);
  await guess(page, 'hobbit');
  await expect(page.getByRole('heading', { name: 'The Hobbit' })).toBeVisible();
});

test('six misses and the Book is Overdue', async ({ page }) => {
  await openGame(page);
  for (const title of ['Dune', 'Emma', 'Holes']) await guess(page, title);
  for (let i = 0; i < 3; i++) await skip(page);
  const result = page.getByRole('region', { name: 'Result' });
  await expect(result).toContainText('Today’s book was');
  await expect(result).toContainText('Overdue');
  await expect(result.getByRole('heading', { name: 'Nineteen Eighty-Four' })).toBeVisible();
});

test('keeps the game where you left it across a reload', async ({ page }) => {
  await openGame(page);
  await guess(page, 'Dune');
  await page.reload();
  await expect(page.getByText('Try 2 of 6')).toBeVisible();
  await expect(page.getByRole('list', { name: 'Your guesses' })).toContainText('Dune');
});

test('records the result in statistics', async ({ page }) => {
  await openGame(page);
  await guess(page, '1984');
  const stats = page.getByRole('dialog', { name: 'Reading record' });
  await expect(stats).toBeVisible();
  await expect(stats.getByText('Played').locator('..')).toContainText('1');
  await expect(stats.getByText('Win %').locator('..')).toContainText('100');
});

test('switches theme from settings', async ({ page }) => {
  await openGame(page);
  await page.getByRole('button', { name: 'Settings' }).click();
  await page.getByRole('dialog', { name: 'Settings' }).getByText('Lamplight', { exact: true }).click();
  await expect(page.getByRole('radio', { name: 'Lamplight' })).toBeChecked();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});
