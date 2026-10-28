import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { closeStats, guess, input, openGame, skip, stubPuzzle } from './helpers';

const scan = (page: Page) => new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();

test.beforeEach(async ({ page }) => stubPuzzle(page));

for (const theme of ['light', 'dark'] as const) {
  test(`the help dialog, the shelf and the finish are accessible in ${theme}`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: theme });
    await page.goto('/');
    expect((await scan(page)).violations).toEqual([]);

    await page.getByRole('button', { name: 'Start reading' }).click();
    await guess(page, 'Dune');
    await skip(page);
    await input(page).fill('an');
    expect((await scan(page)).violations).toEqual([]);

    await guess(page, '1984');
    await closeStats(page);
    expect((await scan(page)).violations).toEqual([]);
  });
}

test('statistics and settings are accessible', async ({ page }) => {
  await openGame(page);
  await page.getByRole('button', { name: 'Statistics' }).click();
  expect((await scan(page)).violations).toEqual([]);

  await page.getByRole('dialog', { name: 'Reading record' }).getByRole('button', { name: 'Close' }).click();
  await page.getByRole('button', { name: 'Settings' }).click();
  expect((await scan(page)).violations).toEqual([]);
});

test('Enter in the input guesses; Enter on a highlighted suggestion only picks it', async ({ page }) => {
  await openGame(page);
  await input(page).fill('dun');
  await input(page).press('ArrowDown');
  await input(page).press('Enter');
  await expect(input(page)).toHaveValue('Dune');
  await expect(page.getByText('Try 1 of 6')).toBeVisible();
  await input(page).press('Enter');
  await expect(page.getByText('Try 2 of 6')).toBeVisible();
});
