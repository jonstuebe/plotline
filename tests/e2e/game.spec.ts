import { expect, test, type Page } from '@playwright/test';
import { closeStats, current, guess, input, openGame, skip, stubPuzzle } from './helpers';

test.beforeEach(async ({ page }) => stubPuzzle(page));

const clues = (page: Page) => page.getByRole('list', { name: 'Clues' });
const listed = (page: Page, n: number) => clues(page).getByRole('listitem').filter({ hasText: `Clue ${n}: ` });
const tab = (page: Page, name: 'Book' | 'Movie') => page.getByRole('navigation', { name: 'Today’s puzzles' }).getByRole('button', { name: new RegExp(`^${name}`) });

test('shows the help sheet on a first visit, once', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('dialog', { name: 'How to Play' })).toBeVisible();
  await page.getByRole('button', { name: 'Start Playing' }).click();

  await page.reload();
  await expect(page.getByRole('dialog', { name: 'How to Play' })).toBeHidden();
});

test('starts on the first Clue with five still locked', async ({ page }) => {
  await openGame(page);
  await expect(current(page)).toContainText('Man keeps a private diary.');
  await expect(current(page)).toContainText('Book · Clue 1 of 6');
  await expect(clues(page).getByText(/, locked$/)).toHaveCount(5);
  // Locked Clues aren't in the page at all.
  await expect(page.getByText('Winston Smith')).toHaveCount(0);
});

test('a wrong guess is noted under its Clue and the next Clue comes up @mobile', async ({ page }) => {
  await openGame(page);
  await guess(page, 'Animal Farm');
  await expect(current(page)).toContainText('rewriting old newspapers');
  await expect(listed(page, 1)).toContainText('Wrong guess: Animal Farm');
  await expect(current(page)).toContainText('Clue 2 of 6');
  await expect(input(page)).toHaveValue('');
});

test('skipping reveals the next Clue and uses a try', async ({ page }) => {
  await openGame(page);
  await skip(page);
  await expect(current(page)).toContainText('Clue 2 of 6');
  await expect(listed(page, 1)).toContainText('Skipped');
});

test('on the last Clue, Skip becomes Give Up', async ({ page }) => {
  await openGame(page);
  for (let i = 0; i < 5; i++) await skip(page);
  await expect(current(page).getByRole('button', { name: 'Give Up' })).toBeVisible();
});

test('refuses an empty or repeated guess without spending a try', async ({ page }) => {
  await openGame(page);
  await guess(page, '   ');
  await expect(page.getByText('Type a title, or skip to the next clue.')).toBeVisible();
  await guess(page, 'Dune');
  await guess(page, 'dune');
  await expect(page.getByText('You already guessed that one.')).toBeVisible();
  await expect(input(page)).toHaveValue('dune');
  await expect(current(page)).toContainText('Clue 2 of 6');
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

test('the right title solves it, and Share gives nothing away', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await openGame(page);
  await guess(page, 'Brave New World');
  await skip(page);
  await guess(page, '1984');

  const result = page.getByRole('region', { name: 'Result' });
  await expect(result.getByRole('heading', { name: 'Nineteen Eighty-Four' })).toBeVisible();
  await expect(result).toContainText('George Orwell · 1949');
  await expect(result).toContainText('Solved on clue 3');
  await expect(clues(page).getByText(/, locked$/)).toHaveCount(0);
  await closeStats(page);

  await page.getByRole('button', { name: 'Share Result' }).click();
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

test('six misses and the answer is shown', async ({ page }) => {
  await openGame(page);
  for (const title of ['Dune', 'Emma', 'Holes']) await guess(page, title);
  for (let i = 0; i < 3; i++) await skip(page);
  const result = page.getByRole('region', { name: 'Result' });
  await expect(result).toContainText('Out of clues');
  await expect(result.getByRole('heading', { name: 'Nineteen Eighty-Four' })).toBeVisible();
  await expect(tab(page, 'Book')).toHaveAccessibleName(/missed/);
});

test('keeps the game where you left it across a reload', async ({ page }) => {
  await openGame(page);
  await guess(page, 'Dune');
  await page.reload();
  await expect(current(page)).toContainText('Clue 2 of 6');
  await expect(listed(page, 1)).toContainText('Dune');
});

test('records the result in statistics', async ({ page }) => {
  await openGame(page);
  await guess(page, '1984');
  const stats = page.getByRole('dialog', { name: 'Statistics' });
  await expect(stats).toBeVisible();
  await expect(stats.getByText('Played').locator('..')).toContainText('1');
  await expect(stats.getByText('Win %').locator('..')).toContainText('100');
});

test('switches appearance from settings', async ({ page }) => {
  await openGame(page);
  await page.getByRole('button', { name: 'Settings' }).click();
  await page.getByRole('dialog', { name: 'Settings' }).getByText('Dark', { exact: true }).click();
  await expect(page.getByRole('radio', { name: 'Dark' })).toBeChecked();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});

test('the Movie tab is its own game, with its own Suggestions, share and stats @mobile', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await openGame(page);
  await tab(page, 'Movie').click();
  await expect(current(page)).toContainText('Movie · Clue 1 of 6');
  await expect(input(page)).toHaveAttribute('placeholder', 'Name the movie');

  await input(page).fill('casa');
  await expect(page.getByRole('option', { name: 'Casablanca' })).toBeVisible();
  await guess(page, 'Casablanca');
  await guess(page, 'jaws');

  const result = page.getByRole('region', { name: 'Result' });
  await expect(result).toContainText('Directed by Steven Spielberg · 1975');
  await expect(tab(page, 'Movie')).toHaveAccessibleName(/solved in 2/);
  await closeStats(page);
  await page.getByRole('button', { name: 'Share Result' }).click();
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  expect(copied).toBe('Plotline Movies #1 2/6\n\n🎬 🟥🟩⬛⬛⬛⬛\n\nplotline.jonstuebe.com');

  // The Book is untouched, and offered from the finished Movie.
  await page.getByRole('button', { name: 'Play Today’s Book' }).click();
  await expect(current(page)).toContainText('Book · Clue 1 of 6');
});
