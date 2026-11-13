import { describe, expect, it } from 'vitest'
import { DEFAULT_RECIPE } from './recipe'
import {
  EDITOR_KEY,
  emptyLibrary,
  exportBackup,
  importBackup,
  LIBRARY_KEY,
  readEditor,
  readLibrary,
  writeEditor,
  writeLibrary,
} from './storage'
const saved = { id: 'recipe-1', recipe: DEFAULT_RECIPE, createdAt: '2026-11-13T04:00:00Z' }
describe('local persistence and backups', () => {
  it('returns defaults for a new browser', () => {
    expect(readEditor()).toEqual(DEFAULT_RECIPE)
    expect(readLibrary()).toEqual(emptyLibrary())
  })
  it('recipes and editor survive a new read (refresh)', () => {
    writeEditor({ ...DEFAULT_RECIPE, name: 'My coffee' })
    writeLibrary({ recipes: [saved], brews: [] })
    expect(readEditor().name).toBe('My coffee')
    expect(readLibrary().recipes[0]).toEqual(saved)
  })
  it('exports and imports recipes and completed brews with notes and rating', () => {
    const library = {
      recipes: [saved],
      brews: [{ ...saved, elapsed: 165000, notes: 'Citrus', rating: 4 }],
    }
    expect(importBackup(exportBackup(library), emptyLibrary())).toEqual(library)
  })
  it('merges backups without duplicating repeated imports', () => {
    const library = { recipes: [saved], brews: [] }
    expect(importBackup(exportBackup(library), library).recipes).toHaveLength(1)
  })
  it('rejects invalid imports atomically', () => {
    const original = { recipes: [saved], brews: [] }
    expect(() =>
      importBackup('{"app":"pour-lab","version":1,"recipes":[{}],"brews":[]}', original),
    ).toThrow()
    expect(original.recipes).toEqual([saved])
    expect(() => importBackup('null', original)).toThrow()
  })
  it('rejects corrupted stored data without overwriting it', () => {
    localStorage.setItem(LIBRARY_KEY, 'corrupt')
    localStorage.setItem(EDITOR_KEY, '{}')
    expect(() => readLibrary()).toThrow()
    expect(() => readEditor()).toThrow()
    expect(localStorage.getItem(LIBRARY_KEY)).toBe('corrupt')
  })
})
