import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { CyberHeader } from '@/components/CyberHeader'

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}))

jest.mock('gsap', () => ({
  context: (fn: () => void) => { fn(); return { revert: jest.fn() } },
  timeline: () => ({
    fromTo: jest.fn().mockReturnThis(),
    to: jest.fn().mockReturnThis(),
  }),
}))

test('TC-HEADER-01: renders SM badge', () => {
  render(<CyberHeader />)
  expect(screen.getByText('SM')).toBeInTheDocument()
})

test('TC-HEADER-02: renders submit link', () => {
  render(<CyberHeader />)
  expect(screen.getByRole('link', { name: /submit/i })).toHaveAttribute('href', '/submit')
})

test('TC-HEADER-03: renders history link', () => {
  render(<CyberHeader />)
  expect(screen.getByRole('link', { name: /history/i })).toHaveAttribute('href', '/history')
})

test('TC-HEADER-04: renders dashboard link', () => {
  render(<CyberHeader />)
  expect(screen.getByRole('link', { name: /dashboard/i })).toHaveAttribute('href', '/dashboard')
})

test('TC-HEADER-05: renders rubrics link', () => {
  render(<CyberHeader />)
  expect(screen.getByRole('link', { name: /rubrics/i })).toHaveAttribute('href', '/rubrics')
})

test('TC-HEADER-06: renders version badge', () => {
  render(<CyberHeader />)
  expect(screen.getByText(/v4.2.1/)).toBeInTheDocument()
})

test('TC-HEADER-07: has header landmark', () => {
  render(<CyberHeader />)
  const header = screen.getByRole('banner')
  expect(header).toBeInTheDocument()
})
