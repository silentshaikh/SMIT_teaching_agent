import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import LoginPage from '../../app/(auth)/login/page'

const mockPush = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}))

jest.mock('gsap', () => ({
  context: (fn: () => void) => { fn(); return { revert: jest.fn() } },
  timeline: () => ({
    fromTo: jest.fn().mockReturnThis(),
  }),
  fromTo: jest.fn(),
}))

jest.mock('@/lib/api', () => ({
  setAuthToken: jest.fn(),
}))

jest.mock('@/store/submission', () => {
  const store: Record<string, unknown> = {}
  const hook = (selector: (s: typeof store) => any) => selector(store)
  return { useSubmissionStore: hook }
})

beforeEach(() => {
  jest.clearAllMocks()
  ;(global.fetch as jest.Mock) = undefined as unknown as jest.Mock
})

test('TC-LOGIN-01: renders sign in heading', () => {
  render(<LoginPage />)
  const heading = screen.getByRole('heading', { name: /Sign In/i })
  expect(heading).toBeInTheDocument()
})

test('TC-LOGIN-02: renders email input', () => {
  render(<LoginPage />)
  expect(screen.getByPlaceholderText(/you@smit.edu/)).toBeInTheDocument()
})

test('TC-LOGIN-03: renders password input', () => {
  render(<LoginPage />)
  expect(screen.getByPlaceholderText(/\*\*\*\*\*\*\*\*/)).toBeInTheDocument()
})

test('TC-LOGIN-04: renders sign in button', () => {
  render(<LoginPage />)
  expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
})

test('TC-LOGIN-05: shows network error on fetch failure', async () => {
  global.fetch = jest.fn().mockRejectedValue(new Error('Network error'))
  render(<LoginPage />)

  fireEvent.change(screen.getByPlaceholderText(/you@smit.edu/), { target: { value: 'a@b.com' } })
  fireEvent.change(screen.getByPlaceholderText(/\*\*\*\*\*\*\*\*/), { target: { value: 'pass' } })
  fireEvent.click(screen.getByRole('button', { name: /sign in/i }))

  expect(await screen.findByText(/network error/i)).toBeInTheDocument()
})

test('TC-LOGIN-06: shows error on 401 response', async () => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: false,
    json: () => Promise.resolve({ detail: 'Invalid credentials' }),
  })
  render(<LoginPage />)

  fireEvent.change(screen.getByPlaceholderText(/you@smit.edu/), { target: { value: 'a@b.com' } })
  fireEvent.change(screen.getByPlaceholderText(/\*\*\*\*\*\*\*\*/), { target: { value: 'wrong' } })
  fireEvent.click(screen.getByRole('button', { name: /sign in/i }))

  expect(await screen.findByText('Invalid credentials')).toBeInTheDocument()
})
