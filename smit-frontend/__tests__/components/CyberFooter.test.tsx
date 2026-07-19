import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { CyberFooter } from '@/components/CyberFooter'

jest.mock('gsap', () => ({
  context: (fn: () => void) => { fn(); return { revert: jest.fn() } },
  timeline: () => ({
    fromTo: jest.fn().mockReturnThis(),
  }),
}))

test('TC-FOOTER-01: renders agent status', () => {
  render(<CyberFooter />)
  expect(screen.getByText('Active')).toBeInTheDocument()
})

test('TC-FOOTER-02: renders model version', () => {
  render(<CyberFooter />)
  expect(screen.getByText(/v4.2.1/)).toBeInTheDocument()
})

test('TC-FOOTER-03: renders SMIT branding', () => {
  render(<CyberFooter />)
  expect(screen.getByText(/SMIT/i)).toBeInTheDocument()
})

test('TC-FOOTER-04: renders current year', () => {
  render(<CyberFooter />)
  expect(screen.getByText(String(new Date().getFullYear()))).toBeInTheDocument()
})

test('TC-FOOTER-05: renders all metric labels', () => {
  render(<CyberFooter />)
  expect(screen.getByText('Agent Status')).toBeInTheDocument()
  expect(screen.getByText('Core Temp')).toBeInTheDocument()
  expect(screen.getByText('Uptime')).toBeInTheDocument()
  expect(screen.getByText('Queue')).toBeInTheDocument()
})
