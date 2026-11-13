import { expect, test } from '@playwright/test'

test('edit, save, refresh, duplicate, brew and retain tasting history', async ({
  page,
}, testInfo) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.goto('/')
  await page.screenshot({
    path: `verification/${testInfo.project.name}-default.png`,
    fullPage: true,
  })
  await expect(page.getByLabel('Coffee dose', { exact: true })).toHaveValue('15')
  await page.getByLabel('Coffee dose', { exact: true }).fill('10')
  await expect(page.getByLabel('Total water', { exact: true })).toHaveValue('170')
  await page.getByLabel('Coffee dose', { exact: true }).fill('15')
  await page.getByRole('button', { name: 'Increase Pour 1 units', exact: true }).click()
  await expect(page.getByLabel('Pour 3 units', { exact: true })).toHaveValue('3')
  await page.getByRole('button', { name: 'Decrease Pour 1 units', exact: true }).click()
  await page.getByRole('button', { name: 'Save recipe', exact: true }).click()
  await page.getByLabel('Recipe name', { exact: true }).fill('My morning cup')
  await page.getByRole('dialog').getByRole('button', { name: 'Save recipe', exact: true }).click()
  await page.reload()
  await page.getByRole('button', { name: 'Saved recipes', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'My morning cup', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Duplicate My morning cup', exact: true }).click()
  await expect(
    page.getByRole('heading', { name: 'My morning cup (copy)', exact: true }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Load recipe', exact: true }).last().click()
  await page.getByRole('button', { name: 'Start brewing' }).click()
  await expect(page.getByLabel('Scale target 75 grams', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Next pour', exact: true }).click()
  await expect(page.getByLabel('Scale target 195 grams', { exact: true })).toBeVisible()
  await page.screenshot({ path: `verification/${testInfo.project.name}-brew.png`, fullPage: true })
  await page.getByRole('button', { name: 'Pause timer', exact: true }).click()
  const paused = await page.getByLabel('Elapsed brew time').textContent()
  await page.getByRole('button', { name: 'Previous pour', exact: true }).click()
  await expect(page.getByLabel('Elapsed brew time')).toHaveText(paused!)
  await page.getByRole('button', { name: 'Next pour', exact: true }).click()
  await page.getByRole('button', { name: 'Next pour', exact: true }).click()
  await expect(page.getByLabel('Scale target 255 grams', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Finish brew', exact: true }).click()
  await page
    .getByLabel('Tasting notes', { exact: true })
    .fill('Honey sweetness and a clean finish.')
  await page.getByRole('button', { name: 'Rate 4 stars', exact: true }).click()
  await page.getByRole('button', { name: 'Save completed brew', exact: true }).click()
  await page.screenshot({
    path: `verification/${testInfo.project.name}-finished.png`,
    fullPage: true,
  })
  await page.getByRole('button', { name: 'Back to editor', exact: true }).click()
  await page.getByRole('button', { name: 'Brew history', exact: true }).click()
  await expect(page.getByText('Honey sweetness and a clean finish.')).toBeVisible()
  await page.reload()
  await page.getByRole('button', { name: 'Brew history', exact: true }).click()
  await expect(page.getByText('Honey sweetness and a clean finish.')).toBeVisible()
  expect(errors).toEqual([])
})

test('production service worker caches the app and permits an offline reload and brew', async ({
  page,
  context,
}) => {
  await page.goto('/')
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready
    if (!navigator.serviceWorker.controller)
      await new Promise<void>((resolve) =>
        navigator.serviceWorker.addEventListener('controllerchange', () => resolve(), {
          once: true,
        }),
      )
  })
  await context.setOffline(true)
  await page.reload()
  await expect(page.getByRole('heading', { name: 'A better cup, by design.' })).toBeVisible()
  await page.getByRole('button', { name: 'Start brewing' }).click()
  await expect(page.getByLabel('Scale target 75 grams', { exact: true })).toBeVisible()
  await context.setOffline(false)
})

test('manual balancing, backups and responsive layouts work', async ({ page }, testInfo) => {
  await page.goto('/')
  await page.getByLabel('Auto-balance last pour', { exact: true }).uncheck()
  await page.getByLabel('Pour 1 units', { exact: true }).fill('6')
  await expect(page.getByRole('button', { name: 'Start brewing' })).toBeDisabled()
  await page.getByRole('button', { name: 'Balance recipe' }).click()
  await expect(page.getByRole('button', { name: 'Start brewing' })).toBeEnabled()
  await page
    .getByRole('group', { name: 'Pour count', exact: true })
    .getByRole('button', { name: '5', exact: true })
    .click()
  await expect(page.getByLabel('Pour 5 units', { exact: true })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  )
  await page.screenshot({
    path: `verification/${testInfo.project.name}-editor.png`,
    fullPage: true,
  })
  await page.getByRole('button', { name: 'Switch to dark mode' }).click()
  await page.screenshot({ path: `verification/${testInfo.project.name}-dark.png`, fullPage: true })
  await page.getByRole('button', { name: 'Saved recipes', exact: true }).click()
  const backup = {
    app: 'pour-lab',
    version: 1,
    recipes: [
      {
        id: 'imported',
        createdAt: new Date().toISOString(),
        recipe: {
          name: 'Imported ritual',
          coffee: 15,
          water: 255,
          units: [5, 8, 4],
          locked: true,
          autoBalance: true,
        },
      },
    ],
    brews: [],
  }
  await page.getByLabel('Import backup file').setInputFiles({
    name: 'backup.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(backup)),
  })
  await expect(page.getByRole('heading', { name: 'Imported ritual', exact: true })).toBeVisible()
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export backup' }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toMatch(/^pour-lab-backup-.*\.json$/)
})
