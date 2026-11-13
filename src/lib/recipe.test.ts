import { describe, expect, it } from 'vitest'
import {
  balance,
  DEFAULT_RECIPE,
  isBalanced,
  isRecipe,
  pours,
  remaining,
  stepValue,
  totalUnits,
  updateCoffee,
  updateCount,
  updateRatio,
  updateUnit,
  updateWater,
} from './recipe'

const fresh = () => structuredClone(DEFAULT_RECIPE)
describe('ratio and unit calculations', () => {
  it('15g / 255g gives a 1:17 ratio and 17 units', () => expect(totalUnits(fresh())).toBe(17))
  it('locked dose changes preserve the 1:17 ratio and allocations', () => {
    const r = updateCoffee(fresh(), 10)
    expect(r.water).toBe(170)
    expect(r.units).toEqual([5, 8, 4])
  })
  it('unlocked dose changes keep the water fixed', () =>
    expect(updateCoffee({ ...fresh(), locked: false }, 10).water).toBe(255))
  it('explicit water edits establish the new locked ratio', () => {
    const r = updateWater(fresh(), 240)
    expect(totalUnits(r)).toBe(16)
    expect(updateCoffee(r, 10).water).toBe(160)
  })
  it('updates water when the ratio is directly edited', () =>
    expect(updateRatio(fresh(), 16).water).toBe(240))
  it('supports 250 / 15 fractional units and exact final target', () => {
    const r = updateWater(fresh(), 250)
    expect(totalUnits(r)).toBeCloseTo(16.666666667, 8)
    expect(pours(r).at(-1)?.target).toBe(250)
    expect(isBalanced(r)).toBe(true)
  })
  it('increasing an earlier pour decreases the last pour', () =>
    expect(updateUnit(fresh(), 0, 6).units).toEqual([6, 8, 3]))
  it('decreasing an earlier pour increases the last pour', () =>
    expect(updateUnit(updateUnit(fresh(), 0, 6), 1, 6).units).toEqual([6, 6, 5]))
  it('clamps a pour to available units and never produces negative pours', () => {
    const r = updateUnit(fresh(), 0, 100)
    expect(r.units).toEqual([9, 8, 0])
    expect(updateUnit(r, 0, -1)).toEqual(r)
    const smaller = updateWater(r, 1)
    expect(smaller.units.every((u) => u >= 0)).toBe(true)
    expect(isBalanced(smaller)).toBe(true)
  })
  it.each([2, 3, 4, 5])('switches to %i pours while preserving exact target water', (count) => {
    const r = updateCount(updateWater(fresh(), 250), count)
    expect(r.units).toHaveLength(count)
    expect(r.water).toBe(250)
    expect(isBalanced(r)).toBe(true)
    expect(pours(r).at(-1)?.target).toBe(250)
  })
  it('produces cumulative scale targets of 75, 195, 255', () =>
    expect(pours(fresh()).map((p) => p.target)).toEqual([75, 195, 255]))
  it('does not accumulate drift over 1000 fractional edits', () => {
    let r = updateWater(fresh(), 250)
    for (let i = 0; i < 1000; i++) {
      r = updateUnit(r, 0, stepValue(r.units[0], 0.1, 1))
      r = updateUnit(r, 0, stepValue(r.units[0], 0.1, -1))
    }
    expect(r.units[0]).toBe(5)
    expect(pours(r).at(-1)?.target).toBe(250)
    expect(remaining(r)).toBeCloseTo(0, 10)
  })
  it('independent pours expose imbalance and balance action repairs overflow', () => {
    const r = updateUnit({ ...fresh(), autoBalance: false }, 0, 20)
    expect(r.units).toEqual([20, 8, 4])
    expect(remaining(r)).toBe(-15)
    const fixed = balance(r)
    expect(fixed.units.every((u) => u >= 0)).toBe(true)
    expect(isBalanced(fixed)).toBe(true)
  })
  it('preserves earlier allocations when changing water if feasible', () =>
    expect(updateWater(fresh(), 300).units).toEqual([5, 8, 7]))
  it('ignores edits to automatic final pour', () =>
    expect(updateUnit(fresh(), 2, 100)).toEqual(fresh()))
  it.each([NaN, Infinity, -1, 0, 100000])('handles invalid numeric value %s safely', (n) => {
    expect(updateCoffee(fresh(), n)).toEqual(fresh())
    expect(updateWater(fresh(), n)).toEqual(fresh())
  })
  it('rejects malformed or inconsistent persisted recipes', () => {
    expect(isRecipe(fresh())).toBe(true)
    expect(isRecipe({ ...fresh(), units: [5, 8, -1] })).toBe(false)
    expect(isRecipe({ ...fresh(), units: [5, 8, 10] })).toBe(false)
    expect(isRecipe({ ...fresh(), coffee: '15' })).toBe(false)
    expect(isRecipe({ ...fresh(), units: [5, 8, '4'] })).toBe(false)
  })
})
