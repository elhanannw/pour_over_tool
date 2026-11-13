import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import App from '../App'
import { DEFAULT_RECIPE } from '../lib/recipe'
import { readLibrary, writeLibrary } from '../lib/storage'

function openEditor() {
  writeLibrary({
    recipes: [],
    brews: [
      {
        id: 'brew',
        recipe: DEFAULT_RECIPE,
        createdAt: '2026-11-13T04:00:00Z',
        elapsed: 120000,
        notes: 'Original notes',
        rating: 3,
      },
    ],
  })
  render(<App />)
  fireEvent.click(screen.getByRole('button', { name: 'Brew history' }))
  fireEvent.click(screen.getByRole('button', { name: 'Edit brew' }))
}

describe('editing brew history', () => {
  it('saves a new name, notes and rating without adding a record', () => {
    openEditor()
    fireEvent.change(screen.getByLabelText('Brew name'), { target: { value: 'Cooling cup' } })
    fireEvent.change(screen.getByLabelText('Tasting notes'), {
      target: { value: '<img src=x onerror=alert(1)>' },
    })
    fireEvent.change(screen.getByLabelText('Coffee rating'), { target: { value: '5' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))
    expect(screen.getByRole('heading', { name: 'Cooling cup' })).toBeInTheDocument()
    expect(screen.getByText('<img src=x onerror=alert(1)>')).toBeInTheDocument()
    expect(document.querySelector('img')).toBeNull()
    expect(readLibrary().brews).toHaveLength(1)
    expect(readLibrary().brews[0]).toMatchObject({
      notes: '<img src=x onerror=alert(1)>',
      rating: 5,
      elapsed: 120000,
    })
  })
  it('discards changes on Cancel and Escape', () => {
    openEditor()
    fireEvent.change(screen.getByLabelText('Brew name'), { target: { value: 'Discard me' } })
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(readLibrary().brews[0].recipe.name).toBe(DEFAULT_RECIPE.name)
    fireEvent.click(screen.getByRole('button', { name: 'Edit brew' }))
    fireEvent.change(screen.getByLabelText('Tasting notes'), { target: { value: 'Discard these' } })
    fireEvent.keyDown(screen.getByLabelText('Tasting notes'), { key: 'Escape' })
    expect(readLibrary().brews[0].notes).toBe('Original notes')
    expect(screen.queryByRole('form', { name: 'Edit recorded brew' })).not.toBeInTheDocument()
  })
  it('requires a nonblank name and allows clearing notes and rating', () => {
    openEditor()
    fireEvent.change(screen.getByLabelText('Brew name'), { target: { value: ' ' } })
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeDisabled()
    fireEvent.change(screen.getByLabelText('Brew name'), { target: { value: 'Cup' } })
    fireEvent.change(screen.getByLabelText('Tasting notes'), { target: { value: '' } })
    fireEvent.change(screen.getByLabelText('Coffee rating'), { target: { value: '' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))
    expect(readLibrary().brews[0]).toMatchObject({ notes: '', rating: null })
  })
  it('retains the draft and original record if storage fails, allowing retry', () => {
    openEditor()
    fireEvent.change(screen.getByLabelText('Tasting notes'), { target: { value: 'Try again' } })
    const storage = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Storage full')
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))
    expect(readLibrary().brews[0].notes).toBe('Original notes')
    expect(screen.getByLabelText('Tasting notes')).toHaveValue('Try again')
    expect(screen.getByText(/Your draft is still here/)).toBeInTheDocument()
    storage.mockRestore()
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))
    expect(readLibrary().brews[0].notes).toBe('Try again')
  })
})
