import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from '../App'
import { readEditor } from '../lib/storage'
import RoasterNotes from './RoasterNotes'

describe('roaster flavour notes', () => {
  it('provides a bounded optional field and retains or clears it across refreshes', () => {
    const { unmount } = render(<App />)
    const input = screen.getByLabelText('Roaster flavour notes')
    expect(input).toHaveAttribute('maxlength', '500')
    fireEvent.change(input, { target: { value: 'Peach and honey' } })
    expect(readEditor().roasterNotes).toBe('Peach and honey')
    unmount()
    render(<App />)
    expect(screen.getByLabelText('Roaster flavour notes')).toHaveValue('Peach and honey')
    fireEvent.change(screen.getByLabelText('Roaster flavour notes'), { target: { value: '' } })
    expect(readEditor()).not.toHaveProperty('roasterNotes')
    expect(screen.getByRole('button', { name: 'Start brewing' })).toBeEnabled()
  })
  it('renders hostile-looking roaster text as text rather than markup', () => {
    const notes = '<img src=x onerror=alert(1)>'
    render(<RoasterNotes notes={notes} />)
    expect(screen.getByText(notes)).toBeInTheDocument()
    expect(document.querySelector('img')).toBeNull()
  })
  it('omits absent or blank notes for existing recipes', () => {
    const { container, rerender } = render(<RoasterNotes />)
    expect(container).toBeEmptyDOMElement()
    rerender(<RoasterNotes notes="   " />)
    expect(container).toBeEmptyDOMElement()
  })
})
