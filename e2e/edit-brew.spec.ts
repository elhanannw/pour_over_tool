import { expect, test } from '@playwright/test'

test('edit, cancel, persist and clear brew history details', async ({ page }, testInfo) => {
  await page.goto('/')
  await page.evaluate(() =>
    localStorage.setItem(
      'pour-lab.library.v1',
      JSON.stringify({
        recipes: [],
        brews: [
          {
            id: 'recorded-brew',
            createdAt: '2026-11-13T04:00:00Z',
            elapsed: 120000,
            notes: 'Original notes',
            rating: 3,
            recipe: {
              name: 'Original cup',
              coffee: 15,
              water: 255,
              units: [5, 8, 4],
              locked: true,
              autoBalance: true,
              roastDate: '2020-01-01',
              roastProfile: 'light',
            },
          },
        ],
      }),
    ),
  )
  await page.reload()
  await page.getByRole('button', { name: 'Brew history', exact: true }).click()
  await page.getByRole('button', { name: 'Edit brew', exact: true }).click()
  await page.getByLabel('Brew name', { exact: true }).fill('Renamed cup')
  await page.getByLabel('Tasting notes', { exact: true }).fill('Honey after cooling')
  await page.getByLabel('Coffee rating').selectOption('5')
  await page.screenshot({
    path: `verification/${testInfo.project.name}-edit-brew.png`,
    fullPage: true,
  })
  await page.getByRole('button', { name: 'Save changes' }).click()
  await page.reload()
  await page.getByRole('button', { name: 'Brew history', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Renamed cup' })).toBeVisible()
  await expect(page.getByText('Honey after cooling')).toBeVisible()
  await expect(page.getByText('02:00', { exact: true })).toBeVisible()
  await expect(page.getByText('Light roast', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Edit brew', exact: true }).click()
  await expect(page.getByLabel('Coffee rating')).toHaveValue('5')
  await page.getByLabel('Brew name', { exact: true }).fill('Cancelled')
  await page.getByRole('button', { name: 'Cancel', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Renamed cup' })).toBeVisible()
  await page.getByRole('button', { name: 'Edit brew', exact: true }).click()
  await page.getByLabel('Tasting notes', { exact: true }).fill('')
  await page.getByLabel('Coffee rating').selectOption('')
  await page.getByRole('button', { name: 'Save changes' }).click()
  await expect(page.getByText('Unrated', { exact: true })).toBeVisible()
  await expect(page.getByText('No tasting notes for this brew.')).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})
