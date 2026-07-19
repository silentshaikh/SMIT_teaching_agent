import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import HistoryPage from '../../app/(student)/history/page'

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

const mockGetHistory = jest.fn()
const mockGetBadges = jest.fn()

jest.mock('@/lib/api', () => ({
  getHistory: (...args: unknown[]) => mockGetHistory(...args),
  getBadges: (...args: unknown[]) => mockGetBadges(...args),
}))

jest.mock('@tanstack/react-query', () => ({
  useQuery: ({ queryKey }: { queryKey: string[] }) => {
    if (queryKey[0] === 'history') {
      return {
        data: [
          { submission_id: 's1', assignment_name: 'HW1', language: 'javascript', score: 85, grade: 'B', status: 'completed', course_name: 'Intro to JS', created_at: '2026-01-15T10:00:00Z' },
          { submission_id: 's2', assignment_name: 'HW2', language: 'python', score: 92, grade: 'A', status: 'completed', course_name: 'Intro to JS', created_at: '2026-01-20T10:00:00Z' },
        ],
        isLoading: false,
      }
    }
    if (queryKey[0] === 'badges') {
      return {
        data: [
          { id: 'first-submission', name: 'First Submission', earned: true, description: 'First' },
          { id: 'five-submissions', name: 'Persistent Learner', earned: false, description: 'Five' },
        ],
        isLoading: false,
      }
    }
    return { data: [], isLoading: false }
  },
}))

test('TC-HISTORY-01: renders heading', () => {
  render(<HistoryPage />)
  expect(screen.getByText(/Submission History/i)).toBeInTheDocument()
})

test('TC-HISTORY-02: renders course group name', () => {
  render(<HistoryPage />)
  expect(screen.getByText('Intro to JS')).toBeInTheDocument()
})

test('TC-HISTORY-03: renders assignment names', () => {
  render(<HistoryPage />)
  expect(screen.getByText('HW1')).toBeInTheDocument()
  expect(screen.getByText('HW2')).toBeInTheDocument()
})

test('TC-HISTORY-04: renders scores', () => {
  render(<HistoryPage />)
  expect(screen.getByText('85')).toBeInTheDocument()
  expect(screen.getByText('92')).toBeInTheDocument()
})

test('TC-HISTORY-05: renders earned badges', () => {
  render(<HistoryPage />)
  expect(screen.getByText('First Submission')).toBeInTheDocument()
})

test('TC-HISTORY-06: does not render unearned badges', () => {
  render(<HistoryPage />)
  expect(screen.queryByText('Persistent Learner')).not.toBeInTheDocument()
})

test('TC-HISTORY-07: renders report links', () => {
  render(<HistoryPage />)
  const links = screen.getAllByRole('link')
  const reportLinks = links.filter(l => l.getAttribute('href')?.startsWith('/report/'))
  expect(reportLinks.length).toBe(2)
})
