import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

async function openDraft(page: Page) {
  await page.goto('/')
  await page.evaluate(() => {
    const recipe = {
      name: 'First cup',
      coffee: 15,
      water: 255,
      units: [5, 8, 4],
      locked: true,
      autoBalance: true,
    }
    const brew = {
      id: 'first',
      recipe,
      createdAt: '2026-11-13T04:00:00Z',
      elapsed: 120000,
      notes: 'Original notes',
      rating: 3,
    }
    localStorage.setItem(
      'pour-lab.library.v1',
      JSON.stringify({
        recipes: [],
        brews: [brew, { ...brew, id: 'second', recipe: { ...recipe, name: 'Second cup' } }],
      }),
    )
  })
  await page.reload()
  await page.getByRole('button', { name: 'Brew history', exact: true }).click()
  const card = page
    .getByRole('article')
    .filter({ has: page.getByRole('heading', { name: 'First cup', exact: true }) })
  await card.getByRole('button', { name: 'Edit brew', exact: true }).click()
  await page.getByLabel('Brew name', { exact: true }).fill('Draft name')
  await page.getByLabel('Tasting notes', { exact: true }).fill('Draft notes')
  await page.getByLabel('Coffee rating').selectOption('5')
}

async function expectDraft(page: Page) {
  await expect(page.getByLabel('Brew name', { exact: true })).toHaveValue('Draft name')
  await expect(page.getByLabel('Tasting notes', { exact: true })).toHaveValue('Draft notes')
  await expect(page.getByLabel('Coffee rating')).toHaveValue('5')
}

test('deleting the edited brew unlocks editing the remaining brew', async ({ page }) => {
  await openDraft(page)
  await page.getByRole('button', { name: 'Delete brew First cup', exact: true }).click()
  await expect(page.getByRole('form', { name: 'Edit recorded brew' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Edit brew', exact: true })).toBeEnabled()
  await page.getByRole('button', { name: 'Edit brew', exact: true }).click()
  await expect(page.getByLabel('Brew name', { exact: true })).toHaveValue('Second cup')
})

test('failed deletion preserves the record and all draft fields', async ({ page }) => {
  await openDraft(page)
  await page.evaluate(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException('Storage full', 'QuotaExceededError')
    }
  })
  await page.getByRole('button', { name: 'Delete brew First cup', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('Could not save')
  await expectDraft(page)
  await expect(page.getByRole('article')).toHaveCount(2)
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem('pour-lab.library.v1')!).brews.length,
    ),
  ).toBe(2)
})

test('library tab switches preserve the draft without prematurely saving it', async ({ page }) => {
  await openDraft(page)
  await page.getByRole('tab', { name: /Saved recipes/ }).click()
  await expect(page.getByRole('form', { name: 'Edit recorded brew' })).toHaveCount(0)
  await page.getByRole('tab', { name: /Brew history/ }).click()
  await expectDraft(page)
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem('pour-lab.library.v1')!).brews[0].notes,
    ),
  ).toBe('Original notes')
  await page.getByRole('button', { name: 'Save changes' }).click()
  await page.reload()
  await page.getByRole('button', { name: 'Brew history', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Draft name', exact: true })).toBeVisible()
  await expect(page.getByText('Draft notes', { exact: true })).toBeVisible()
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem('pour-lab.library.v1')!).brews[0].rating,
    ),
  ).toBe(5)
})
