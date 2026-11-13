import { expect, test } from '@playwright/test'

test.use({ timezoneId: 'America/Los_Angeles' })

test('roast status follows local dates and all four colours in both themes', async ({
  page,
}, testInfo) => {
  // This instant is already Jan 15 in UTC, but still Jan 14 for this user.
  await page.clock.setFixedTime(new Date('2026-01-15T07:59:00Z'))
  await page.goto('/')
  await page.getByLabel('Roast date', { exact: true }).fill('2026-01-01')
  await page.getByLabel('Roast profile', { exact: true }).selectOption('light')
  await expect(page.getByLabel('Roast date', { exact: true })).toHaveAttribute('max', '2026-01-14')
  const status = page.locator('.roast-status')
  await expect(status).toContainText('Resting')
  const grey = await status.evaluate((element) => getComputedStyle(element).backgroundColor)
  const states = [
    ['2026-01-15T08:00:00Z', 'Optimal brew window', 'optimal'],
    ['2026-03-01T08:00:00Z', 'Two months since roast', 'yellow'],
    ['2026-04-01T07:00:00Z', 'Three months or more since roast', 'red'],
  ]
  const colours = [grey]
  for (const [date, label, state] of states) {
    await page.clock.setFixedTime(new Date(date))
    await page.evaluate(() => window.dispatchEvent(new Event('focus')))
    await expect(status).toContainText(label)
    await expect(status).toHaveClass(new RegExp(`roast-status--${state}`))
    colours.push(await status.evaluate((element) => getComputedStyle(element).backgroundColor))
    await page.screenshot({
      path: `verification/${testInfo.project.name}-roast-${state}-light.png`,
      fullPage: true,
    })
    await page.getByRole('button', { name: 'Switch to dark mode' }).click()
    const dark = await status.evaluate((element) => getComputedStyle(element).backgroundColor)
    expect(dark).not.toBe(colours.at(-1))
    await page.screenshot({
      path: `verification/${testInfo.project.name}-roast-${state}-dark.png`,
      fullPage: true,
    })
    await page.getByRole('button', { name: 'Switch to light mode' }).click()
  }
  expect(new Set(colours).size).toBe(4)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  )
  await page.getByLabel('Roast profile', { exact: true }).selectOption('')
  await expect(status).toHaveCount(0)
  await page.getByLabel('Roast date', { exact: true }).fill('')
  await expect(page.getByRole('button', { name: 'Start brewing' })).toBeEnabled()
})
