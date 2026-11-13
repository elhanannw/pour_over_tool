import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCheck,
  Coffee,
  Monitor,
  Pause,
  Play,
  RotateCcw,
  Star,
  Timer,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import type { Recipe } from '../lib/recipe'
import { fmt, POUR_COLORS, pours, totalUnits } from '../lib/recipe'
import { elapsed, formatTime, newClock, pauseClock, resumeClock } from '../lib/timer'
import type { BrewRecord } from '../lib/storage'
import { Toggle } from './Controls'
import PourBar from './PourBar'

interface WakeLockSentinel {
  release: () => Promise<void>
  addEventListener: (name: string, callback: () => void) => void
}
type WakeNavigator = Navigator & {
  wakeLock?: { request: (kind: 'screen') => Promise<WakeLockSentinel> }
}

export default function Brew({
  recipe,
  autoStart,
  wakeDefault,
  onExit,
  onSave,
}: {
  recipe: Recipe
  autoStart: boolean
  wakeDefault: boolean
  onExit: () => void
  onSave: (brew: BrewRecord) => boolean
}) {
  const [index, setIndex] = useState(0)
  const [clock, setClock] = useState(() => newClock(autoStart))
  const [, tick] = useState(0)
  const [finished, setFinished] = useState(false)
  const [notes, setNotes] = useState('')
  const [rating, setRating] = useState<number | null>(null)
  const [saved, setSaved] = useState(false)
  const [wake, setWake] = useState(wakeDefault)
  const [wakeStatus, setWakeStatus] = useState('')
  const sequence = pours(recipe)
  const current = sequence[index]
  const time = elapsed(clock)
  useEffect(() => {
    if (clock.startedAt === null) return
    const interval = window.setInterval(() => tick((n) => n + 1), 250)
    return () => window.clearInterval(interval)
  }, [clock.startedAt])
  useEffect(() => {
    if (!wake || finished) {
      setWakeStatus('')
      return
    }
    const api = (navigator as WakeNavigator).wakeLock
    if (!api) {
      setWakeStatus('Screen wake lock is not available in this browser.')
      return
    }
    let sentinel: WakeLockSentinel | undefined
    let cancelled = false
    const request = async () => {
      if (document.visibilityState !== 'visible' || sentinel) return
      try {
        const lock = await api.request('screen')
        if (cancelled) {
          await lock.release()
          return
        }
        sentinel = lock
        setWakeStatus('Screen is staying awake.')
        lock.addEventListener('release', () => {
          sentinel = undefined
          if (!cancelled)
            setWakeStatus('Wake lock released. Keep this tab visible to reacquire it.')
        })
      } catch {
        if (!cancelled) setWakeStatus('Could not keep the screen awake. You can continue brewing.')
      }
    }
    void request()
    document.addEventListener('visibilitychange', request)
    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', request)
      void sentinel?.release().catch(() => {})
    }
  }, [wake, finished])
  const restart = () => {
    setIndex(0)
    setClock(newClock(autoStart))
    setFinished(false)
    setNotes('')
    setRating(null)
    setSaved(false)
  }
  if (finished)
    return (
      <section className="finish-screen">
        <div className="finish-icon">
          <CheckCheck size={30} />
        </div>
        <div className="eyebrow">THE BEST PART IS NEXT</div>
        <h1>Time to taste.</h1>
        <p>Take a moment. Let it cool. See what you discover.</p>
        <div className="panel finish-card">
          <div className="finish-heading">
            <div>
              <span className="eyebrow">{recipe.name}</span>
              <h2>Your brew, complete.</h2>
            </div>
            <span className="finished-time">
              <Timer size={17} />
              {formatTime(time)}
            </span>
          </div>
          <div className="finish-stats">
            <span>{fmt(recipe.coffee)}g coffee</span>
            <span>{fmt(recipe.water)}g water</span>
            <span>1:{fmt(totalUnits(recipe), 2)}</span>
            <span>{recipe.units.length} pours</span>
          </div>
          <PourBar recipe={recipe} />
          <div className="finish-allocations">
            {sequence.map((p, i) => (
              <div key={i}>
                <i style={{ background: POUR_COLORS[i] }} />
                <span>{p.label}</span>
                <b>
                  {fmt(p.units, 4)} u · {fmt(p.water)}g
                </b>
              </div>
            ))}
          </div>
          <label className="input-label" htmlFor="tasting-notes">
            Tasting notes
          </label>
          <textarea
            id="tasting-notes"
            placeholder="Bright citrus? Caramel sweetness? What will you try next?"
            rows={3}
            maxLength={10000}
            value={notes}
            disabled={saved}
            onChange={(e) => setNotes(e.target.value)}
          />
          <div className="rating-row">
            <span>
              How was your cup? <small>(optional)</small>
            </span>
            <div role="group" aria-label="Brew rating">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  aria-label={`Rate ${n} stars`}
                  aria-pressed={rating === n}
                  disabled={saved}
                  className={rating !== null && n <= rating ? 'rated' : ''}
                  onClick={() => setRating(rating === n ? null : n)}
                >
                  <Star size={23} fill={rating !== null && n <= rating ? 'currentColor' : 'none'} />
                </button>
              ))}
            </div>
          </div>
          <button
            className="primary-button"
            disabled={saved}
            onClick={() => {
              if (
                onSave({
                  id: crypto.randomUUID(),
                  recipe,
                  createdAt: new Date().toISOString(),
                  elapsed: time,
                  notes: notes.trim(),
                  rating,
                })
              )
                setSaved(true)
            }}
          >
            {saved ? <Check size={17} /> : <Coffee size={17} />}
            {saved ? 'Saved to brew history' : 'Save completed brew'}
          </button>
        </div>
        <div className="finish-actions">
          <button className="secondary-button" onClick={onExit}>
            <ArrowLeft size={16} />
            Back to editor
          </button>
          <button className="secondary-button" onClick={restart}>
            <RotateCcw size={16} />
            Brew again
          </button>
        </div>
      </section>
    )
  return (
    <section className="brew-screen">
      <div className="brew-topline">
        <button className="text-button" onClick={onExit}>
          <ArrowLeft size={16} />
          Back to editor
        </button>
        <span className="brew-recipe-name">{recipe.name}</span>
        <span className="live-indicator">
          <span /> BREW MODE
        </span>
      </div>
      <div className="brew-progress" aria-label={`Pour ${index + 1} of ${sequence.length}`}>
        {sequence.map((p, i) => (
          <div key={i} className={i < index ? 'complete' : i === index ? 'current' : ''}>
            <span>{i < index ? <Check size={14} /> : i + 1}</span>
            <small>{p.label}</small>
          </div>
        ))}
      </div>
      <div
        className="brew-target-card"
        style={{ '--pour-color': POUR_COLORS[index] } as React.CSSProperties}
      >
        <span className="eyebrow">
          POUR {index + 1} OF {sequence.length} <span className="dot-separator">/</span>{' '}
          {current.label.toUpperCase()}
        </span>
        <p className="water-to-add">
          Add {index > 0 ? 'another ' : ''}
          <strong>{fmt(current.water)}g</strong> of water
        </p>
        <div className="scale-label">CUMULATIVE SCALE TARGET</div>
        <div className="scale-number" aria-label={`Scale target ${fmt(current.target)} grams`}>
          {fmt(current.target)}
          <span>g</span>
        </div>
        <p className="brew-instruction">
          {index === 0 ? 'Start with a tared scale. ' : ''}Pour {fmt(current.water)}g. Stop when
          your scale reads <strong>{fmt(current.target)}g.</strong>
          <br />
          {index < sequence.length - 1
            ? 'When you’re ready, move to the next pour.'
            : 'Let it draw down. Your cup is almost ready.'}
        </p>
        <div className="brew-clock">
          <Timer size={18} />
          <time aria-label="Elapsed brew time">{formatTime(time)}</time>
          <button
            aria-label={clock.startedAt === null ? 'Resume timer' : 'Pause timer'}
            onClick={() => setClock((c) => (c.startedAt === null ? resumeClock(c) : pauseClock(c)))}
          >
            {clock.startedAt === null ? <Play size={19} /> : <Pause size={19} />}
          </button>
          <button
            aria-label="Reset timer"
            onClick={() => setClock(newClock(clock.startedAt !== null))}
          >
            <RotateCcw size={17} />
          </button>
        </div>
      </div>
      <div className="brew-navigation">
        <button
          className="secondary-button"
          disabled={index === 0}
          onClick={() => setIndex((i) => i - 1)}
        >
          <ArrowLeft size={18} />
          Previous pour
        </button>
        {index < sequence.length - 1 ? (
          <button className="primary-button" onClick={() => setIndex((i) => i + 1)}>
            Next pour
            <ArrowRight size={20} />
          </button>
        ) : (
          <button
            className="primary-button"
            onClick={() => {
              setClock((c) => pauseClock(c))
              setFinished(true)
            }}
          >
            Finish brew
            <Check size={20} />
          </button>
        )}
      </div>
      <div className="brew-utilities">
        <button className="text-button" onClick={restart}>
          <RotateCcw size={14} />
          Restart brew
        </button>
        {index < sequence.length - 1 && (
          <button
            className="text-button"
            onClick={() => {
              setClock((c) => pauseClock(c))
              setFinished(true)
            }}
          >
            Finish brew
          </button>
        )}
      </div>
      <div className="wake-setting">
        <Monitor size={16} />
        <Toggle checked={wake} onChange={setWake} label="Keep screen awake" />
      </div>
      {wake && wakeStatus && (
        <p className="wake-status" role="status">
          {wakeStatus}
        </p>
      )}
      <p className="brew-bottom-note">Follow your flow. Pours advance only when you’re ready.</p>
    </section>
  )
}
