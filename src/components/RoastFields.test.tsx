import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from '../App'
import { DEFAULT_RECIPE } from '../lib/recipe'
import { readEditor, readLibrary, writeEditor } from '../lib/storage'

afterEach(() => vi.useRealTimers())

describe('optional roast inputs and guidance', () => {
  it('saves, clears and restores optional details without changing the pour plan', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 0, 15, 12))
    const { unmount } = render(<App />)
    fireEvent.change(screen.getByLabelText('Roast date'), { target: { value: '2026-01-01' } })
    expect(screen.getByText('Choose a roast profile to see the brew window.')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Roast profile'), { target: { value: 'light' } })
    expect(screen.getByText('Optimal brew window')).toBeInTheDocument()
    expect(readEditor()).toMatchObject({
      roastDate: '2026-01-01',
      roastProfile: 'light',
      units: [5, 8, 4],
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save recipe' }))
    fireEvent.change(screen.getByLabelText('Recipe name'), { target: { value: 'Light roast cup' } })
    fireEvent.submit(screen.getByLabelText('Recipe name').closest('form')!)
    expect(readLibrary().recipes[0].recipe).toMatchObject({
      roastDate: '2026-01-01',
      roastProfile: 'light',
    })
    unmount()
    render(<App />)
    expect(screen.getByLabelText('Roast date')).toHaveValue('2026-01-01')
    expect(screen.getByLabelText('Roast profile')).toHaveValue('light')
    fireEvent.change(screen.getByLabelText('Roast date'), { target: { value: '' } })
    expect(readEditor()).not.toHaveProperty('roastDate')
    expect(screen.getByText('Add a roast date to see the brew window.')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Roast profile'), { target: { value: '' } })
    expect(readEditor()).not.toHaveProperty('roastProfile')
    expect(screen.queryByText('Optimal brew window')).not.toBeInTheDocument()
  })

  it.each([
    ['2026-01-02', 'Resting', 'resting'],
    ['2026-01-15', 'Optimal brew window', 'optimal'],
    ['2026-03-01', 'Two months since roast', 'yellow'],
    ['2026-04-01', 'Three months or more since roast', 'red'],
  ])('shows a colour and text status on %s', (today, label, state) => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(`${today}T12:00:00`))
    writeEditor({ ...DEFAULT_RECIPE, roastDate: '2026-01-01', roastProfile: 'light' })
    render(<App />)
    expect(screen.getByText(label).closest('.roast-status')).toHaveClass(`roast-status--${state}`)
  })

  it('rejects a future date without overwriting the existing date', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 0, 15, 12))
    writeEditor({ ...DEFAULT_RECIPE, roastDate: '2026-01-01' })
    render(<App />)
    expect(screen.getByLabelText('Roast date')).toHaveAttribute('max', '2026-01-15')
    fireEvent.change(screen.getByLabelText('Roast date'), { target: { value: '2026-01-16' } })
    expect(screen.getByRole('alert')).toHaveTextContent('on or before today')
    expect(readEditor().roastDate).toBe('2026-01-01')
    expect(screen.getByLabelText('Roast date')).toHaveAttribute('aria-invalid', 'true')
  })

  it('refreshes at local midnight and after returning to the app', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 0, 14, 23, 59, 59))
    writeEditor({ ...DEFAULT_RECIPE, roastDate: '2026-01-01', roastProfile: 'light' })
    render(<App />)
    expect(screen.getByText('Resting')).toBeInTheDocument()
    act(() => vi.advanceTimersByTime(1100))
    expect(screen.getByText('Optimal brew window')).toBeInTheDocument()
    vi.setSystemTime(new Date(2026, 2, 1, 12))
    fireEvent.focus(window)
    expect(screen.getByText('Two months since roast')).toBeInTheDocument()
    vi.setSystemTime(new Date(2026, 3, 1, 12))
    fireEvent(document, new Event('visibilitychange'))
    expect(screen.getByText('Three months or more since roast')).toBeInTheDocument()
  })
})
