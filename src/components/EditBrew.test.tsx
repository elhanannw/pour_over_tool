import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import App from '../App'
import { DEFAULT_RECIPE } from '../lib/recipe'
import { readLibrary, writeLibrary } from '../lib/storage'

function openEditor(withSecond = false) {
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
      ...(withSecond
        ? [
            {
              id: 'brew-2',
              recipe: { ...DEFAULT_RECIPE, name: 'Second cup' },
              createdAt: '2026-11-13T04:00:00Z',
              elapsed: 120000,
              notes: '',
              rating: null,
            },
          ]
        : []),
    ],
  })
  render(<App />)
  fireEvent.click(screen.getByRole('button', { name: 'Brew history' }))
  const card = screen.getByRole('heading', { name: DEFAULT_RECIPE.name }).closest('article')!
  fireEvent.click(within(card).getByRole('button', { name: 'Edit brew' }))
}

describe('editing brew history', () => {
  it.each(['tabs', 'navigation'])(
    'retains all draft fields across library %s switches until saved',
    (navigation) => {
      openEditor()
      fireEvent.change(screen.getByLabelText('Brew name'), { target: { value: 'Draft name' } })
      fireEvent.change(screen.getByLabelText('Tasting notes'), { target: { value: 'Draft notes' } })
      fireEvent.change(screen.getByLabelText('Coffee rating'), { target: { value: '5' } })
      const role = navigation === 'tabs' ? 'tab' : 'button'
      fireEvent.click(screen.getByRole(role, { name: /Saved recipes/ }))
      expect(screen.queryByRole('form', { name: 'Edit recorded brew' })).not.toBeInTheDocument()
      fireEvent.click(screen.getByRole(role, { name: /Brew history/ }))
      expect(screen.getByLabelText('Brew name')).toHaveValue('Draft name')
      expect(screen.getByLabelText('Tasting notes')).toHaveValue('Draft notes')
      expect(screen.getByLabelText('Coffee rating')).toHaveValue('5')
      expect(readLibrary().brews[0]).toMatchObject({ notes: 'Original notes', rating: 3 })
      fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))
      expect(readLibrary().brews[0]).toMatchObject({
        recipe: { name: 'Draft name' },
        notes: 'Draft notes',
        rating: 5,
      })
    },
  )
  it('unlocks the remaining brew after deleting the edited brew', () => {
    openEditor(true)
    fireEvent.click(screen.getByRole('button', { name: `Delete brew ${DEFAULT_RECIPE.name}` }))
    expect(screen.queryByRole('form', { name: 'Edit recorded brew' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Edit brew' })).toBeEnabled()
    fireEvent.click(screen.getByRole('button', { name: 'Edit brew' }))
    expect(screen.getByLabelText('Brew name')).toHaveValue('Second cup')
  })
  it('preserves the draft when deleting the edited brew fails', () => {
    openEditor(true)
    fireEvent.change(screen.getByLabelText('Brew name'), { target: { value: 'Draft name' } })
    fireEvent.change(screen.getByLabelText('Tasting notes'), { target: { value: 'Draft notes' } })
    fireEvent.change(screen.getByLabelText('Coffee rating'), { target: { value: '5' } })
    const storage = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Storage full')
    })
    fireEvent.click(screen.getByRole('button', { name: `Delete brew ${DEFAULT_RECIPE.name}` }))
    expect(readLibrary().brews).toHaveLength(2)
    expect(screen.getByLabelText('Brew name')).toHaveValue('Draft name')
    expect(screen.getByLabelText('Tasting notes')).toHaveValue('Draft notes')
    expect(screen.getByLabelText('Coffee rating')).toHaveValue('5')
    storage.mockRestore()
    fireEvent.click(screen.getByRole('button', { name: `Delete brew ${DEFAULT_RECIPE.name}` }))
    expect(screen.getByRole('button', { name: 'Edit brew' })).toBeEnabled()
  })
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
