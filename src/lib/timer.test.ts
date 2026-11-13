import { describe, expect, it } from 'vitest'
import { elapsed, formatTime, newClock, pauseClock, resumeClock } from './timer'
describe('wall-clock brew timer', () => {
  it('starts automatically and measures wall time across backgrounding', () =>
    expect(elapsed(newClock(true, 1000), 76000)).toBe(75000))
  it('supports manual start', () => expect(elapsed(newClock(false, 1000), 76000)).toBe(0))
  it('pauses without accruing more time and resumes without losing elapsed time', () => {
    const paused = pauseClock(newClock(true, 1000), 76000)
    expect(elapsed(paused, 999000)).toBe(75000)
    expect(elapsed(resumeClock(paused, 100000), 105000)).toBe(80000)
  })
  it('does not restart an already running clock', () => {
    const c = newClock(true, 1000)
    expect(resumeClock(c, 4000)).toBe(c)
  })
  it('formats minutes and seconds', () => {
    expect(formatTime(75000)).toBe('01:15')
    expect(formatTime(3600000)).toBe('60:00')
  })
})
