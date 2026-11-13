import { expect, test } from '@playwright/test'

test('roaster flavour notes persist independently from personal tasting notes', async ({
  page,
}, testInfo) => {
  await page.goto('/')
  const input = page.getByLabel('Roaster flavour notes', { exact: true })
  await expect(input).toHaveAttribute('maxlength', '500')
  await input.fill('Peach, honey and cocoa')
  await page.getByRole('button', { name: 'Save recipe', exact: true }).click()
  await page.getByLabel('Recipe name', { exact: true }).fill('Roaster notes cup')
  await page.getByRole('dialog').getByRole('button', { name: 'Save recipe', exact: true }).click()
  await page.reload()
  await expect(input).toHaveValue('Peach, honey and cocoa')
  await page.screenshot({
    path: `verification/${testInfo.project.name}-roaster-notes.png`,
    fullPage: true,
  })
  await page.getByRole('button', { name: 'Saved recipes', exact: true }).click()
  await expect(page.getByText('Peach, honey and cocoa', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Load recipe', exact: true }).click()
  await page.getByRole('button', { name: 'Start brewing', exact: true }).click()
  await page.getByRole('button', { name: 'Finish brew', exact: true }).click()
  await expect(page.getByText('Peach, honey and cocoa', { exact: true })).toBeVisible()
  await page.getByLabel('Tasting notes', { exact: true }).fill('My cup was floral')
  await page.getByRole('button', { name: 'Save completed brew', exact: true }).click()
  await page.getByRole('button', { name: 'Back to editor', exact: true }).click()
  await page.getByRole('button', { name: 'Brew history', exact: true }).click()
  await expect(page.getByText('Peach, honey and cocoa', { exact: true })).toBeVisible()
  await expect(page.getByText('My cup was floral', { exact: true })).toBeVisible()
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export backup', exact: true }).click()
  const backupPath = await (await downloadPromise).path()
  expect(backupPath).not.toBeNull()
  await page.evaluate(() => localStorage.removeItem('pour-lab.library.v1'))
  await page.reload()
  await page.getByRole('button', { name: 'Saved recipes', exact: true }).click()
  await page.getByLabel('Import backup file').setInputFiles(backupPath!)
  await expect(page.getByText('Peach, honey and cocoa', { exact: true })).toBeVisible()
  await page.getByRole('tab', { name: /Brew history/ }).click()
  await expect(page.getByText('My cup was floral', { exact: true })).toBeVisible()
  await expect(page.getByText('Peach, honey and cocoa', { exact: true })).toBeVisible()
})
