import { render, screen, fireEvent, act, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { Navbar } from '@/components/Navbar'

// TC-009
test('TC-009: renders hamburger menu button', () => {
  render(<Navbar />)
  const button = screen.getByRole('button', { name: /open menu/i })
  expect(button).toBeInTheDocument()
})

// TC-010
test('TC-010: renders navigation links', () => {
  render(<Navbar />)
  expect(screen.getByRole('link', { name: /home/i })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: /submit/i })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: /history/i })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: /dashboard/i })).toBeInTheDocument()
})

// TC-011
test('TC-011: toggle menu opens mobile drawer', async () => {
  render(<Navbar />)
  const button = screen.getByRole('button', { name: /open menu/i })
  await act(async () => {
    fireEvent.click(button)
  })
  await waitFor(() => {
    expect(screen.getByRole('button', { name: /close menu/i })).toBeInTheDocument()
  })
})

// TC-012
test('TC-012: button has aria-label', () => {
  render(<Navbar />)
  const button = screen.getByRole('button', { name: /open menu/i })
  expect(button).toHaveAttribute('aria-label', 'Open menu')
})

// TC-013
test('TC-013: button toggles aria-label', async () => {
  render(<Navbar />)
  const openBtn = screen.getByRole('button', { name: /open menu/i })
  await act(async () => {
    fireEvent.click(openBtn)
  })
  await waitFor(() => {
    const closeBtn = screen.getByRole('button', { name: /close menu/i })
    expect(closeBtn).toHaveAttribute('aria-label', 'Close menu')
  })
})

// TC-014
test('TC-014: navigation contains all required links', () => {
  render(<Navbar />)
  const links = screen.getAllByRole('link')
  const hrefs = links.map((l) => l.getAttribute('href'))
  expect(hrefs).toContain('/')
  expect(hrefs).toContain('/submit')
  expect(hrefs).toContain('/history')
  expect(hrefs).toContain('/dashboard')
  expect(hrefs).toContain('/rubrics')
})
