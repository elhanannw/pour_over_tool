import { describe, expect, it } from 'vitest'
import { DEFAULT_RECIPE, isRecipe } from './recipe'
import {
  emptyLibrary,
  exportBackup,
  importBackup,
  LIBRARY_KEY,
  MAX_ENTRIES,
  validateLibrary,
  writeLibrary,
} from './storage'

const entry = { id: 'safe', recipe: DEFAULT_RECIPE, createdAt: '2026-11-13T04:00:00Z' }
const backup = () => ({ app: 'pour-lab', version: 1, recipes: [structuredClone(entry)], brews: [] })

describe('untrusted backup boundaries', () => {
  it.each(['__proto__', 'constructor', 'prototype', 'extra'])(
    'rejects unexpected %s keys at every object boundary',
    (key) => {
      for (const level of ['root', 'entry', 'recipe']) {
        const data = backup()
        const target =
          level === 'root' ? data : level === 'entry' ? data.recipes[0] : data.recipes[0].recipe
        Object.defineProperty(target, key, { enumerable: true, value: { polluted: true } })
        expect(() => importBackup(JSON.stringify(data), emptyLibrary())).toThrow(
          'Invalid Pour Lab backup',
        )
        expect(({} as Record<string, unknown>).polluted).toBeUndefined()
      }
    },
  )
  it('rejects inherited fields and array-shaped records', () => {
    expect(isRecipe(Object.create(DEFAULT_RECIPE))).toBe(false)
    expect(validateLibrary(Object.create({ recipes: [], brews: [] }))).toBe(false)
    expect(isRecipe([])).toBe(false)
  })
  it('retains script-like names and notes only as plain strings for React rendering', () => {
    const data = backup()
    data.recipes[0].recipe.name = '<img src=x onerror=alert(1)>'
    expect(importBackup(JSON.stringify(data), emptyLibrary()).recipes[0].recipe.name).toBe(
      data.recipes[0].recipe.name,
    )
  })
  it('rejects duplicate IDs and excessive collection sizes', () => {
    const data = backup()
    data.recipes.push(structuredClone(entry))
    expect(() => importBackup(JSON.stringify(data), emptyLibrary())).toThrow()
    data.recipes = Array.from({ length: MAX_ENTRIES + 1 }, (_, i) => ({ ...entry, id: String(i) }))
    expect(() => importBackup(JSON.stringify(data), emptyLibrary())).toThrow()
  })
  it('limits actual UTF-8 file bytes, including multibyte text', () => {
    expect(() => importBackup('漢'.repeat(1_700_000), emptyLibrary())).toThrow('too large')
  })
  it.each(['2026-02-30T04:00:00Z', 'not-a-date', '2026-11-13'])(
    'rejects invalid or ambiguous date %s',
    (date) => {
      const data = backup()
      data.recipes[0].createdAt = date
      expect(() => importBackup(JSON.stringify(data), emptyLibrary())).toThrow()
    },
  )
  it('rejects nonfinite and unreasonable elapsed times', () => {
    const data = { ...backup(), brews: [{ ...entry, elapsed: 1e308, notes: '', rating: null }] }
    expect(() => importBackup(JSON.stringify(data), emptyLibrary())).toThrow()
  })
  it('rejects malformed JSON, scalars and missing fields without changing existing data', () => {
    const existing = { recipes: [entry], brews: [] }
    for (const text of ['null', '[]', 'true', '{}', '{invalid', '{"app":"pour-lab","version":1}']) {
      expect(() => importBackup(text, existing)).toThrow()
      expect(existing.recipes).toEqual([entry])
    }
  })
  it('refuses invalid writes before altering browser data', () => {
    const existing = { recipes: [entry], brews: [] }
    writeLibrary(existing)
    const before = localStorage.getItem(LIBRARY_KEY)
    expect(() => writeLibrary({ ...existing, extra: 'unexpected' } as typeof existing)).toThrow()
    expect(localStorage.getItem(LIBRARY_KEY)).toBe(before)
  })
  it('refuses a library whose exported Unicode backup would exceed the import limit', () => {
    const data = {
      recipes: [],
      brews: Array.from({ length: 200 }, (_, i) => ({
        ...entry,
        id: String(i),
        elapsed: 120000,
        notes: '漢'.repeat(10000),
        rating: null,
      })),
    }
    expect(() => writeLibrary(data)).toThrow('backup size limit')
    expect(localStorage.getItem(LIBRARY_KEY)).toBeNull()
  })
  it('imports its own canonical backup without losing saved records', () => {
    const data = { recipes: [entry], brews: [] }
    expect(importBackup(exportBackup(data), emptyLibrary())).toEqual(data)
  })
})
