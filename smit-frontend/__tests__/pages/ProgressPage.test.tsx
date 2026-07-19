import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import ProgressPage from '../../app/(student)/progress/page'

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}))

jest.mock('next/router', () => ({
  useRouter: () => ({ push: jest.fn(), query: {} }),
}))

jest.mock('gsap', () => ({
  context: (fn: () => void) => { fn(); return { revert: jest.fn() } },
  timeline: () => ({
    fromTo: jest.fn().mockReturnThis(),
  }),
}))

const mockGetStudentProgress = jest.fn()

jest.mock('@/lib/api', () => ({
  getStudentProgress: (...args: unknown[]) => mockGetStudentProgress(...args),
}))

jest.mock('@tanstack/react-query', () => ({
  useQuery: () => ({
    data: {
      student_id: 'student-1',
      time_series: [
        { submission_id: 's1', created_at: '2026-01-15T10:00:00Z', score: 70, grade: 'C' },
        { submission_id: 's2', created_at: '2026-01-20T10:00:00Z', score: 85, grade: 'B' },
        { submission_id: 's3', created_at: '2026-01-25T10:00:00Z', score: 92, grade: 'A' },
      ],
      mistake_type_frequency: [
        { type: 'syntax', count: 5 },
        { type: 'logic', count: 3 },
      ],
    },
    isLoading: false,
  }),
}))

test('TC-PROGRESS-01: renders heading', () => {
  render(<ProgressPage />)
  expect(screen.getByText(/My Progress/i)).toBeInTheDocument()
})

test('TC-PROGRESS-02: renders score over time section', () => {
  render(<ProgressPage />)
  expect(screen.getByText(/Score Over Time/i)).toBeInTheDocument()
})

test('TC-PROGRESS-03: renders mistake frequency section', () => {
  render(<ProgressPage />)
  expect(screen.getByText(/Mistake Frequency/i)).toBeInTheDocument()
})

test('TC-PROGRESS-04: renders individual scores', () => {
  render(<ProgressPage />)
  expect(screen.getByText('70')).toBeInTheDocument()
  expect(screen.getByText('85')).toBeInTheDocument()
  expect(screen.getByText('92')).toBeInTheDocument()
})

test('TC-PROGRESS-05: renders mistake types', () => {
  render(<ProgressPage />)
  expect(screen.getByText('syntax')).toBeInTheDocument()
  expect(screen.getByText('logic')).toBeInTheDocument()
})

test('TC-PROGRESS-06: renders mistake counts', () => {
  render(<ProgressPage />)
  expect(screen.getByText('5')).toBeInTheDocument()
  const threes = screen.getAllByText('3')
  expect(threes.length).toBeGreaterThanOrEqual(1)
})
