import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import RubricsPage from '../../app/(teacher)/rubrics/page'

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}))

jest.mock('gsap', () => ({
  context: (fn: () => void) => { fn(); return { revert: jest.fn() } },
  timeline: () => ({
    fromTo: jest.fn().mockReturnThis(),
  }),
}))

jest.mock('@/lib/api', () => ({
  fetchRubrics: jest.fn(),
  compareRubricVersions: jest.fn(),
}))

jest.mock('@tanstack/react-query', () => ({
  useQuery: ({ queryKey }: { queryKey: string[] }) => {
    if (queryKey[0] === 'rubrics') {
      return {
        data: [
          {
            id: 'r1', assignment_name: 'JS Basics', language: 'javascript',
            criteria: { syntax: 40, logic: 40, style: 20 }, max_score: 100, created_by: 'teacher1',
          },
          {
            id: 'r2', assignment_name: 'Python HW', language: 'python',
            criteria: { correctness: 60, style: 40 }, max_score: 100, created_by: 'teacher2',
          },
        ],
        isLoading: false,
      }
    }
    if (queryKey[0] === 'rubric-compare') {
      return {
        data: [
          { version_id: 'v1', version_number: 1, created_by: 'teacher1', created_at: '2026-01-01', average_score: 75, submission_count: 10 },
          { version_id: 'v2', version_number: 2, created_by: 'teacher1', created_at: '2026-02-01', average_score: 82, submission_count: 12 },
        ],
        isLoading: false,
      }
    }
    return { data: [], isLoading: false }
  },
}))

test('TC-RUBRICS-01: renders heading', () => {
  render(<RubricsPage />)
  expect(screen.getByText(/Grading Rubrics/i)).toBeInTheDocument()
})

test('TC-RUBRICS-02: renders rubric names', () => {
  render(<RubricsPage />)
  expect(screen.getByText('JS Basics')).toBeInTheDocument()
  expect(screen.getByText('Python HW')).toBeInTheDocument()
})

test('TC-RUBRICS-03: renders rubric languages', () => {
  render(<RubricsPage />)
  expect(screen.getByText('javascript')).toBeInTheDocument()
  expect(screen.getByText('python')).toBeInTheDocument()
})

test('TC-RUBRICS-04: renders criteria', () => {
  render(<RubricsPage />)
  expect(screen.getByText('syntax')).toBeInTheDocument()
  expect(screen.getByText('logic')).toBeInTheDocument()
  expect(screen.getByText('correctness')).toBeInTheDocument()
})

test('TC-RUBRICS-05: renders version history button', () => {
  render(<RubricsPage />)
  const buttons = screen.getAllByRole('button', { name: /version history/i })
  expect(buttons.length).toBe(2)
})

test('TC-RUBRICS-06: toggles version history', () => {
  render(<RubricsPage />)
  const buttons = screen.getAllByRole('button', { name: /version history/i })
  fireEvent.click(buttons[0])
  const vHeaders = screen.getAllByText(/>? ?Version History/i)
  expect(vHeaders.length).toBeGreaterThan(0)
  expect(screen.getByText('v1')).toBeInTheDocument()
  expect(screen.getByText('v2')).toBeInTheDocument()
})

test('TC-RUBRICS-07: renders max score', () => {
  render(<RubricsPage />)
  const maxLabels = screen.getAllByText(/MAX:.*pts/)
  expect(maxLabels.length).toBeGreaterThanOrEqual(2)
})
