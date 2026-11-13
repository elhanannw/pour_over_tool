import { expect, test } from '@playwright/test'
import headers from '../security/headers.json' with { type: 'json' }

test('serves browser security headers and blocks inline scripts and outbound fetches', async ({
  page,
}) => {
  const response = await page.goto('/')
  const actual = response!.headers()
  for (const [key, value] of Object.entries(headers)) expect(actual[key.toLowerCase()]).toBe(value)
  const results = await page.evaluate(async () => {
    const script = document.createElement('script')
    script.textContent = 'globalThis.__inlineProbe = true'
    document.body.append(script)
    let blockedFetch = false
    try {
      await fetch('https://security-test.invalid/probe')
    } catch {
      blockedFetch = true
    }
    return {
      inlineExecuted: Boolean((globalThis as Record<string, unknown>).__inlineProbe),
      blockedFetch,
    }
  })
  expect(results).toEqual({ inlineExecuted: false, blockedFetch: true })
  await expect(page.getByRole('button', { name: 'Start brewing' })).toBeEnabled()
})

test('hostile imported names and notes render as text without executing markup or calling external hosts', async ({
  page,
  context,
}) => {
  const external: string[] = []
  context.on('request', (request) => {
    if (!request.url().startsWith('http://127.0.0.1:4173/')) external.push(request.url())
  })
  await page.goto('/')
  await page.getByRole('button', { name: 'Saved recipes', exact: true }).click()
  const hostileName = '<img src=x onerror="globalThis.__importProbe=true">'
  const hostileNotes = '</p><script>globalThis.__importProbe=true</script>'
  const entry = {
    id: 'hostile',
    createdAt: new Date().toISOString(),
    recipe: {
      name: hostileName,
      coffee: 15,
      water: 255,
      units: [5, 8, 4],
      locked: true,
      autoBalance: true,
    },
  }
  const data = {
    app: 'pour-lab',
    version: 1,
    recipes: [entry],
    brews: [{ ...entry, elapsed: 120000, notes: hostileNotes, rating: 3 }],
  }
  await page.getByLabel('Import backup file').setInputFiles({
    name: 'hostile.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(data)),
  })
  await expect(page.getByRole('heading', { name: hostileName, exact: true })).toBeVisible()
  await expect(page.locator('img[src="x"]')).toHaveCount(0)
  await page.getByRole('tab', { name: /Brew history/ }).click()
  await expect(page.getByText(hostileNotes, { exact: true })).toBeVisible()
  expect(
    await page.evaluate(() => (globalThis as Record<string, unknown>).__importProbe),
  ).toBeUndefined()
  expect(external).toEqual([])
})

test('rejects prototype-bearing imports atomically and preserves existing recipes', async ({
  page,
}) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Save recipe', exact: true }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Save recipe', exact: true }).click()
  await page.getByRole('button', { name: 'Saved recipes', exact: true }).click()
  const malicious =
    '{"app":"pour-lab","version":1,"recipes":[],"brews":[],"__proto__":{"polluted":true}}'
  await page.getByLabel('Import backup file').setInputFiles({
    name: 'malicious.json',
    mimeType: 'application/json',
    buffer: Buffer.from(malicious),
  })
  await expect(page.getByRole('alert')).toContainText('Invalid Pour Lab backup')
  await expect(page.getByRole('heading', { name: 'Everyday balance', exact: true })).toBeVisible()
  expect(await page.evaluate(() => (({}) as Record<string, unknown>).polluted)).toBeUndefined()
})
