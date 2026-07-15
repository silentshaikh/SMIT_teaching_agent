import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import HomePage from '../../app/page'

// TC-001
test('TC-001: renders main heading with role', () => {
  render(<HomePage />)
  const heading = screen.getByRole('heading')
  expect(heading).toBeInTheDocument()
})

// TC-002
test('TC-002: contains navigation links', () => {
  render(<HomePage />)
  const links = screen.getAllByRole('link')
  expect(links.length).toBeGreaterThan(0)
})

// TC-003
test('TC-003: contains submit link', () => {
  render(<HomePage />)
  const submitLink = screen.getByRole('link', { name: /submit code/i })
  expect(submitLink).toBeInTheDocument()
  expect(submitLink).toHaveAttribute('href', '/submit')
})

// TC-004
test('TC-004: renders without crashing', () => {
  const { container } = render(<HomePage />)
  expect(container).toBeInTheDocument()
})

// TC-005
test('TC-005: displays site title', () => {
  render(<HomePage />)
  const title = screen.getByRole('heading')
  expect(title).toHaveTextContent(/SMIT/i)
})

// TC-006
test('TC-006: has accessible landmark', () => {
  render(<HomePage />)
  const heading = screen.getByRole('heading')
  expect(heading.tagName).toBe('H1')
})

// TC-007
test('TC-007: page loads with animation container', () => {
  const { container } = render(<HomePage />)
  expect(container.firstChild).toBeTruthy()
})

// TC-008
test('TC-008: contains call to action section', () => {
  render(<HomePage />)
  const submitLink = screen.getByRole('link', { name: /submit code/i })
  expect(submitLink).toBeInTheDocument()
})
