import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import SubmitPage from '../../app/(student)/submit/page'

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}))

jest.mock('gsap', () => ({
  context: (fn: () => void) => { fn(); return { revert: jest.fn() } },
  timeline: () => ({
    fromTo: jest.fn().mockReturnThis(),
  }),
}))

jest.mock('next/dynamic', () => () => {
  const MockComponent = () => <div>Mock 3D Scene</div>
  return MockComponent
})

jest.mock('@/lib/api', () => ({
  submitFile: jest.fn(),
  fetchAssignments: jest.fn().mockResolvedValue([]),
}))

jest.mock('@/store/submission', () => {
  const store: Record<string, unknown> = {}
  const hook = (selector: (s: typeof store) => any) => selector(store)
  return { useSubmissionStore: hook }
})

jest.mock('@tanstack/react-query', () => ({
  useMutation: () => ({ mutate: jest.fn(), isPending: false }),
  useQuery: () => ({ data: [], isLoading: false }),
}))

test('TC-SUBMIT-01: renders submit page heading', () => {
  render(<SubmitPage />)
  expect(screen.getByText(/Submit Assignment/i)).toBeInTheDocument()
})

test('TC-SUBMIT-02: renders single upload button', () => {
  render(<SubmitPage />)
  expect(screen.getByRole('button', { name: /single upload/i })).toBeInTheDocument()
})

test('TC-SUBMIT-03: renders bulk upload button', () => {
  render(<SubmitPage />)
  expect(screen.getByRole('button', { name: /bulk upload/i })).toBeInTheDocument()
})

test('TC-SUBMIT-04: renders supported languages', () => {
  render(<SubmitPage />)
  expect(screen.getByText(/JavaScript/)).toBeInTheDocument()
  expect(screen.getByText(/Python/)).toBeInTheDocument()
  expect(screen.getByText(/HTML/)).toBeInTheDocument()
})

test('TC-SUBMIT-05: renders how it works section', () => {
  render(<SubmitPage />)
  expect(screen.getByText(/How It Works/i)).toBeInTheDocument()
})

test('TC-SUBMIT-06: toggles to bulk mode', () => {
  render(<SubmitPage />)
  fireEvent.click(screen.getByRole('button', { name: /bulk upload/i }))
  expect(screen.getByText(/bulk mode/i)).toBeInTheDocument()
})
