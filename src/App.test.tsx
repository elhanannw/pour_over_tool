import { act, fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from './App'
import { DEFAULT_RECIPE } from './lib/recipe'
import { writeLibrary } from './lib/storage'
describe('recipe persistence in the app', () => {
  it('preserves concurrent edits while reading an imported backup', async () => {
    const entry = { id: 'existing', recipe: DEFAULT_RECIPE, createdAt: '2026-11-13T04:00:00Z' }
    writeLibrary({ recipes: [entry], brews: [] })
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Saved recipes' }))
    let resolveText!: (text: string) => void
    const pending = new Promise<string>((resolve) => {
      resolveText = resolve
    })
    const file = new File([''], 'backup.json', { type: 'application/json' })
    Object.defineProperty(file, 'text', { value: () => pending })
    fireEvent.change(screen.getByLabelText('Import backup file'), { target: { files: [file] } })
    fireEvent.click(screen.getByRole('button', { name: 'Duplicate Everyday balance' }))
    await act(async () => {
      resolveText(
        JSON.stringify({
          app: 'pour-lab',
          version: 1,
          recipes: [
            { ...entry, id: 'imported', recipe: { ...DEFAULT_RECIPE, name: 'Imported cup' } },
          ],
          brews: [],
        }),
      )
      await pending
    })
    expect(screen.getByRole('heading', { name: 'Everyday balance (copy)' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Imported cup' })).toBeInTheDocument()
  })
  it('recalculates immediately for ratio and water edits, ignoring unsafe input', () => {
    render(<App />)
    fireEvent.change(screen.getByLabelText('Brew ratio'), { target: { value: '16' } })
    expect(screen.getByLabelText('Total water')).toHaveValue(240)
    fireEvent.change(screen.getByLabelText('Total water'), { target: { value: '250' } })
    expect(screen.getByLabelText('Brew ratio')).toHaveValue(16.67)
    fireEvent.change(screen.getByLabelText('Coffee dose'), { target: { value: '0' } })
    fireEvent.blur(screen.getByLabelText('Coffee dose'))
    expect(screen.getByLabelText('Coffee dose')).toHaveValue(15)
    expect(screen.getByLabelText('Total water')).toHaveValue(250)
  })
  it('saves a named recipe, retains it across remount, loads and duplicates it', () => {
    const { unmount } = render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Save recipe' }))
    fireEvent.change(screen.getByLabelText('Recipe name'), { target: { value: 'Morning ritual' } })
    fireEvent.submit(screen.getByLabelText('Recipe name').closest('form')!)
    unmount()
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Saved recipes' }))
    expect(screen.getByText('Morning ritual', { selector: 'h2' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Duplicate Morning ritual' }))
    expect(screen.getByText('Morning ritual (copy)', { selector: 'h2' })).toBeInTheDocument()
    fireEvent.click(screen.getAllByRole('button', { name: 'Load recipe' })[0])
    expect(screen.getByLabelText('Coffee dose')).toHaveValue(15)
  })
})
