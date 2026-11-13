export interface Clock {
  accumulated: number
  startedAt: number | null
}
export const newClock = (autoStart: boolean, now = Date.now()): Clock => ({
  accumulated: 0,
  startedAt: autoStart ? now : null,
})
export const elapsed = (clock: Clock, now = Date.now()) =>
  clock.accumulated + (clock.startedAt === null ? 0 : Math.max(0, now - clock.startedAt))
export const pauseClock = (clock: Clock, now = Date.now()): Clock => ({
  accumulated: elapsed(clock, now),
  startedAt: null,
})
export const resumeClock = (clock: Clock, now = Date.now()): Clock =>
  clock.startedAt === null ? { ...clock, startedAt: now } : clock
export const formatTime = (ms: number) => {
  const seconds = Math.floor(ms / 1000)
  return `${Math.floor(seconds / 60)
    .toString()
    .padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`
}
