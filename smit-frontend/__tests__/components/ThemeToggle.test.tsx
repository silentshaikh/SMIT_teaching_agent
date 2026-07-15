import { render, screen, fireEvent, act } from '@testing-library/react'
import '@testing-library/jest-dom'
import { ThemeToggle } from '@/components/ThemeToggle'

beforeEach(() => {
  jest.useFakeTimers()
})

afterEach(() => {
  jest.useRealTimers()
})

// TC-015
test('TC-015: renders toggle button', () => {
  render(<ThemeToggle />)
  const button = screen.getByRole('button')
  expect(button).toBeInTheDocument()
})

// TC-016
test('TC-016: has accessible aria-label', () => {
  render(<ThemeToggle />)
  const button = screen.getByRole('button')
  expect(button).toHaveAttribute('aria-label')
  expect(button.getAttribute('aria-label')).toMatch(/switch to/i)
})

// TC-017
test('TC-017: toggles theme on click', () => {
  render(<ThemeToggle />)
  const button = screen.getByRole('button')
  act(() => {
    fireEvent.click(button)
    jest.advanceTimersByTime(200)
  })
  const theme = document.documentElement.getAttribute('data-theme')
  expect(theme).toBe('light')
})

// TC-018
test('TC-018: toggles back on second click', () => {
  render(<ThemeToggle />)
  const button = screen.getByRole('button')
  act(() => {
    fireEvent.click(button)
    jest.advanceTimersByTime(200)
  })
  act(() => {
    fireEvent.click(button)
    jest.advanceTimersByTime(200)
  })
  const theme = document.documentElement.getAttribute('data-theme')
  expect(theme).toBe('dark')
})

// TC-019
test('TC-019: shows moon icon in dark mode', () => {
  const { container } = render(<ThemeToggle />)
  const svg = container.querySelector('svg')
  expect(svg).toBeInTheDocument()
})
