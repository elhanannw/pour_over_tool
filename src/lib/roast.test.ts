import { describe, expect, it } from 'vitest'
import { isRoastDate, isRoastProfile, localDate, ROAST_PROFILES, roastWindow } from './roast'

describe('roast calendar guidance', () => {
  it.each(ROAST_PROFILES)('$label becomes optimal after $restDays days', ({ id, restDays }) => {
    const before = `2026-01-${String(restDays).padStart(2, '0')}`
    const ready = `2026-01-${String(restDays + 1).padStart(2, '0')}`
    expect(roastWindow('2026-01-01', id, before)?.state).toBe('resting')
    expect(roastWindow('2026-01-01', id, ready)?.state).toBe('optimal')
  })

  it.each([
    ['2026-01-15', 'resting'],
    ['2026-01-28', 'resting'],
    ['2026-01-29', 'optimal'],
    ['2026-03-14', 'optimal'],
    ['2026-03-15', 'yellow'],
    ['2026-04-14', 'yellow'],
    ['2026-04-15', 'red'],
    ['2027-01-15', 'red'],
  ])('uses the exact boundary on %s', (today, state) => {
    expect(roastWindow('2026-01-15', 'light', today)?.state).toBe(state)
  })

  it('clamps calendar anniversaries to the last day of a shorter month', () => {
    expect(roastWindow('2025-12-31', 'medium', '2026-02-28')).toMatchObject({
      yellowFrom: '2026-02-28',
      redFrom: '2026-03-31',
      state: 'yellow',
    })
    expect(roastWindow('2026-01-31', 'dark', '2026-04-30')?.redFrom).toBe('2026-04-30')
    expect(roastWindow('2023-12-31', 'light', '2024-02-29')?.yellowFrom).toBe('2024-02-29')
    expect(roastWindow('2026-10-31', 'light', '2027-01-31')?.state).toBe('red')
  })

  it('counts calendar days across DST changes and leap days', () => {
    expect(roastWindow('2026-03-07', 'dark', '2026-03-12')).toMatchObject({
      ageDays: 5,
      state: 'optimal',
    })
    expect(roastWindow('2024-02-28', 'dark', '2024-03-04')).toMatchObject({
      ageDays: 5,
      state: 'optimal',
    })
  })

  it('uses the local date rather than the UTC date', () => {
    expect(localDate(new Date(2026, 0, 1, 0, 15))).toBe('2026-01-01')
    expect(localDate(new Date(2026, 0, 1, 23, 59))).toBe('2026-01-01')
  })

  it.each([
    '2026-02-30',
    '2025-02-29',
    '0000-01-01',
    '2026-13-01',
    '2026-00-01',
    '2026-01-00',
    '2026-1-1',
    '2026-01-01T00:00:00Z',
    '<script>',
    '',
    null,
    {},
    20260101,
  ])('rejects malformed dates: %s', (value) => {
    expect(isRoastDate(value, '2026-11-13')).toBe(false)
  })

  it('rejects future dates and unrecognised profiles', () => {
    expect(isRoastDate('2026-11-14', '2026-11-13')).toBe(false)
    expect(isRoastDate('2026-11-13', '2026-11-13')).toBe(true)
    expect(isRoastProfile('__proto__')).toBe(false)
    expect(isRoastProfile('medium-light')).toBe(true)
    expect(roastWindow('2026-11-14', 'light', '2026-11-13')).toBeNull()
    expect(roastWindow('invalid', 'light', '2026-11-13')).toBeNull()
  })
})
