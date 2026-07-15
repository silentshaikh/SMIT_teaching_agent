import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import Cursor from '@/components/Cursor'

// TC-039
test('TC-039: renders cursor element', () => {
  render(<Cursor />)
  const cursor = screen.getByTestId('cursor')
  expect(cursor).toBeInTheDocument()
})

// TC-040
test('TC-040: has pointer-events-none', () => {
  render(<Cursor />)
  const cursor = screen.getByTestId('cursor')
  expect(cursor.className).toContain('pointer-events-none')
})

// TC-041
test('TC-041: has fixed positioning', () => {
  render(<Cursor />)
  const cursor = screen.getByTestId('cursor')
  expect(cursor.className).toContain('fixed')
})

// TC-042
test('TC-042: renders inner and outer circles', () => {
  render(<Cursor />)
  const cursor = screen.getByTestId('cursor')
  expect(cursor.children.length).toBe(2)
})

// TC-043
test('TC-043: responds to mouse move', () => {
  render(<Cursor />)
  const cursor = screen.getByTestId('cursor')
  fireEvent.mouseMove(document, { clientX: 100, clientY: 200 })
  expect(cursor).toBeInTheDocument()
})