import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { FileUploader } from '@/components/FileUploader'

const mockPush = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}))

jest.mock('@tanstack/react-query', () => ({
  useMutation: () => ({
    mutate: jest.fn(),
    isPending: false,
  }),
  useQuery: ({ queryKey }: { queryKey: string[] }) => {
    if (queryKey[0] === 'assignments') {
      return {
        data: [
          { id: 'a1', name: 'Homework 1', course_id: 'c1', rubric_id: 'r1', due_date: null, created_at: '2026-01-01' },
          { id: 'a2', name: 'Homework 2', course_id: 'c1', rubric_id: null, due_date: null, created_at: '2026-01-02' },
        ],
        isLoading: false,
      }
    }
    if (queryKey[0] === 'rubrics') {
      return {
        data: [
          { id: 'r1', assignment_name: 'Python Basics', language: 'python', criteria: { syntax: 50, logic: 50 }, max_score: 100, created_by: 'teacher' },
        ],
        isLoading: false,
      }
    }
    return { data: [], isLoading: false }
  },
}))

jest.mock('@/lib/api', () => ({
  submitFile: jest.fn(),
  fetchAssignments: jest.fn(),
  fetchRubrics: jest.fn(),
  getHistory: jest.fn(),
}))

jest.mock('@/store/submission', () => {
  const store: Record<string, unknown> = {
    setSubmissionId: jest.fn(),
    setStatus: jest.fn(),
    setOriginalCode: jest.fn(),
    setLanguage: jest.fn(),
    setStudentId: jest.fn(),
    setAssignmentName: jest.fn(),
    setRubricId: jest.fn(),
    studentId: '',
    userId: 'u1',
  }
  const hook = (selector: (s: typeof store) => any) => selector(store)
  return { useSubmissionStore: hook }
})

beforeEach(() => jest.clearAllMocks())

test('TC-020: renders file input', () => {
  const { container } = render(<FileUploader />)
  expect(container.querySelector('input[type="file"]')).toBeInTheDocument()
})

test('TC-021: renders student ID input', () => {
  render(<FileUploader />)
  expect(screen.getByPlaceholderText(/> SMIT-101/)).toBeInTheDocument()
})

test('TC-022: renders assignment dropdown', () => {
  render(<FileUploader />)
  const selects = screen.getAllByRole('combobox')
  expect(selects.length).toBeGreaterThanOrEqual(1)
})

test('TC-023: renders submit button', () => {
  render(<FileUploader />)
  expect(screen.getByRole('button', { name: /submit/i })).toBeInTheDocument()
})

test('TC-024: shows error for invalid file type', () => {
  const { container } = render(<FileUploader />)
  const input = container.querySelector('input[type="file"]') as HTMLInputElement
  const file = new File(['test'], 'test.txt', { type: 'text/plain' })
  Object.defineProperty(file, 'size', { value: 100 })
  fireEvent.change(input, { target: { files: [file] } })
  expect(screen.getByText(/invalid file type/i)).toBeInTheDocument()
})

test('TC-025: accepts valid .js file', () => {
  const { container } = render(<FileUploader />)
  const input = container.querySelector('input[type="file"]') as HTMLInputElement
  const file = new File(['console.log("hi")'], 'test.js', { type: 'text/javascript' })
  Object.defineProperty(file, 'size', { value: 100 })
  fireEvent.change(input, { target: { files: [file] } })
  expect(screen.queryByText(/invalid file type/i)).not.toBeInTheDocument()
})

test('TC-026: submit button disabled without file', () => {
  render(<FileUploader />)
  expect(screen.getByRole('button', { name: /submit/i })).toBeDisabled()
})

test('TC-028: renders rubric selector', () => {
  render(<FileUploader />)
  expect(screen.getByText('-- Select Rubric --')).toBeInTheDocument()
})

test('TC-029: submit button is disabled without file', () => {
  render(<FileUploader />)
  const btn = screen.getByRole('button', { name: /submit/i })
  expect(btn).toBeDisabled()
})

test('TC-030: does not render recent submissions when no data', () => {
  render(<FileUploader />)
  expect(screen.queryByText(/recent submissions/i)).not.toBeInTheDocument()
})
