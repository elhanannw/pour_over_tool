import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Brew from './Brew'
import { DEFAULT_RECIPE } from '../lib/recipe'

describe('brew interactions', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-11-13T04:00:00Z'))
  })
  afterEach(() => vi.useRealTimers())
  const start = (autoStart = true) =>
    render(
      <Brew
        recipe={DEFAULT_RECIPE}
        autoStart={autoStart}
        wakeDefault={false}
        onExit={vi.fn()}
        onSave={vi.fn(() => true)}
      />,
    )
  it('displays correct cumulative targets and preserves timer through pour navigation', () => {
    start()
    expect(screen.getByLabelText('Scale target 75 grams')).toBeInTheDocument()
    act(() => vi.advanceTimersByTime(75000))
    fireEvent.click(screen.getByRole('button', { name: 'Next pour' }))
    expect(screen.getByLabelText('Scale target 195 grams')).toBeInTheDocument()
    expect(screen.getByLabelText('Elapsed brew time')).toHaveTextContent('01:15')
    fireEvent.click(screen.getByRole('button', { name: 'Next pour' }))
    expect(screen.getByLabelText('Scale target 255 grams')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Previous pour' }))
    expect(screen.getByLabelText('Elapsed brew time')).toHaveTextContent('01:15')
  })
  it('pauses and resumes the displayed clock correctly', () => {
    start()
    act(() => vi.advanceTimersByTime(5000))
    fireEvent.click(screen.getByRole('button', { name: 'Pause timer' }))
    act(() => vi.advanceTimersByTime(10000))
    expect(screen.getByLabelText('Elapsed brew time')).toHaveTextContent('00:05')
    fireEvent.click(screen.getByRole('button', { name: 'Resume timer' }))
    act(() => vi.advanceTimersByTime(5000))
    expect(screen.getByLabelText('Elapsed brew time')).toHaveTextContent('00:10')
  })
  it('manual start stays at zero and time never advances pours', () => {
    start(false)
    act(() => vi.advanceTimersByTime(120000))
    expect(screen.getByLabelText('Elapsed brew time')).toHaveTextContent('00:00')
    fireEvent.click(screen.getByRole('button', { name: 'Resume timer' }))
    act(() => vi.advanceTimersByTime(120000))
    expect(screen.getByLabelText('Scale target 75 grams')).toBeInTheDocument()
  })
  it('finishes with stopped timer, saves once, and can brew again', () => {
    start()
    act(() => vi.advanceTimersByTime(30000))
    fireEvent.click(screen.getByRole('button', { name: 'Finish brew' }))
    expect(screen.getByText('Time to taste.')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Tasting notes'), { target: { value: 'Honey' } })
    fireEvent.click(screen.getByRole('button', { name: 'Rate 4 stars' }))
    fireEvent.click(screen.getByRole('button', { name: 'Save completed brew' }))
    expect(screen.getByRole('button', { name: 'Saved to brew history' })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: 'Brew again' }))
    expect(screen.getByLabelText('Scale target 75 grams')).toBeInTheDocument()
    expect(screen.getByLabelText('Elapsed brew time')).toHaveTextContent('00:00')
  })
  it('can reset the timer without changing the current pour', () => {
    start()
    fireEvent.click(screen.getByRole('button', { name: 'Next pour' }))
    act(() => vi.advanceTimersByTime(15000))
    fireEvent.click(screen.getByRole('button', { name: 'Reset timer' }))
    expect(screen.getByLabelText('Elapsed brew time')).toHaveTextContent('00:00')
    expect(screen.getByLabelText('Scale target 195 grams')).toBeInTheDocument()
  })
  it('handles browsers without wake lock support gracefully', () => {
    render(
      <Brew
        recipe={DEFAULT_RECIPE}
        autoStart={true}
        wakeDefault={true}
        onExit={vi.fn()}
        onSave={vi.fn(() => true)}
      />,
    )
    expect(
      screen.getByText('Screen wake lock is not available in this browser.'),
    ).toBeInTheDocument()
  })
  it('requests a wake lock and releases it on completion', async () => {
    const release = vi.fn(async () => {})
    const request = vi.fn(async () => ({ release, addEventListener: vi.fn() }))
    Object.defineProperty(navigator, 'wakeLock', { configurable: true, value: { request } })
    try {
      render(
        <Brew
          recipe={DEFAULT_RECIPE}
          autoStart={true}
          wakeDefault={true}
          onExit={vi.fn()}
          onSave={vi.fn(() => true)}
        />,
      )
      await act(async () => {})
      expect(request).toHaveBeenCalledWith('screen')
      fireEvent.click(screen.getByRole('button', { name: 'Finish brew' }))
      expect(release).toHaveBeenCalledOnce()
    } finally {
      delete (navigator as unknown as Record<string, unknown>).wakeLock
    }
  })
})
