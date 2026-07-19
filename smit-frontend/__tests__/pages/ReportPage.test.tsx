import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'

const mockPush = jest.fn()
const mockReplace = jest.fn()

jest.mock('next/navigation', () => ({
  useParams: () => ({ id: 'test-sub-id' }),
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
}))

jest.mock('gsap', () => ({
  context: (fn: () => void) => { fn(); return { revert: jest.fn() } },
  fromTo: jest.fn(),
}))

jest.mock('@/components/ScoreReveal', () => ({
  ScoreReveal: () => <div data-testid="score-reveal" />,
}))

jest.mock('@/components/MistakeList', () => ({
  MistakeList: () => <div data-testid="mistake-list" />,
}))

jest.mock('@/components/CodeViewer', () => ({
  CodeViewer: () => <div data-testid="code-viewer" />,
}))

const mockDownloadReport = jest.fn().mockResolvedValue({ submission_id: 'test-sub-id', score: 80 })
const mockSubmitFile = jest.fn().mockResolvedValue({ submission_id: 'new-sub-id', status: 'processing' })

jest.mock('@/lib/api', () => ({
  downloadReport: (...args: any[]) => mockDownloadReport(...args),
  submitFile: (...args: any[]) => mockSubmitFile(...args),
}))

const mockStoreState: Record<string, any> = {
  status: 'processing',
  originalCode: 'const x = 1;',
  language: 'javascript',
  studentId: 'stu-1',
  assignmentName: 'W1',
  rubricId: 'default',
  setSubmissionId: jest.fn(),
  setStatus: jest.fn(),
  setOriginalCode: jest.fn(),
  setLanguage: jest.fn(),
  setStudentId: jest.fn(),
  setAssignmentName: jest.fn(),
  setRubricId: jest.fn(),
}

jest.mock('@/store/submission', () => ({
  useSubmissionStore: (selector: (s: typeof mockStoreState) => any) => selector(mockStoreState),
}))

let mockPollerData: any = undefined
let mockPollerIsLoading = true
let mockPollerIsFailed = false
let mockPollerError: Error | null = null

jest.mock('@/lib/hooks/useReportPoller', () => ({
  useReportPoller: () => ({
    data: mockPollerData,
    isLoading: mockPollerIsLoading,
    isFailed: mockPollerIsFailed,
    error: mockPollerError,
  }),
}))

jest.mock('@tanstack/react-query', () => ({
  useMutation: (opts: any) => ({
    mutate: jest.fn((vars: any, callbacks: any) => {
      if (opts.mutationFn) {
        Promise.resolve()
          .then(() => opts.mutationFn())
          .then((data: any) => callbacks?.onSuccess?.(data))
          .catch((err: any) => callbacks?.onError?.(err))
      }
    }),
    isPending: false,
    isError: false,
    error: null,
  }),
  useQuery: () => ({
    data: undefined,
    isLoading: true,
    error: null,
  }),
}))

import ReportPage from '../../app/(student)/report/[id]/page'

afterEach(() => {
  jest.restoreAllMocks()
})

beforeEach(() => {
  mockPollerData = undefined
  mockPollerIsLoading = true
  mockPollerIsFailed = false
  mockPollerError = null
  mockPush.mockClear()
  mockReplace.mockClear()
  mockDownloadReport.mockClear()
  mockSubmitFile.mockClear()
})

// TC-051: Report page shows loading state while fetching
test('TC-051: shows loading skeleton while fetching report', () => {
  render(<ReportPage />)
  expect(screen.getByText(/analyzing neural pathways/i)).toBeInTheDocument()
})

// TC-052: Report page shows error block on poller error
test('TC-052: shows error block when poller returns error', () => {
  mockPollerIsLoading = false
  mockPollerError = new Error('network fail')

  render(<ReportPage />)
  expect(screen.getByText(/failed to load report/i)).toBeInTheDocument()
})

// TC-053: Report page shows resubmit button when isFailed
test('TC-053: shows resubmit button when isFailed is true', () => {
  mockPollerIsLoading = false
  mockPollerIsFailed = true

  render(<ReportPage />)
  expect(screen.getByText(/system failure/i)).toBeInTheDocument()
  expect(screen.getByText(/>> resubmit/i)).toBeInTheDocument()
})

// TC-054: Report page shows download button when report is loaded
test('TC-054: shows download button when report is loaded', () => {
  mockPollerIsLoading = false
  mockPollerData = {
    submission_id: 'test-sub-id',
    student_id: 'stu-1',
    assignment_name: 'W1',
    score: 80,
    grade: 'B',
    mistakes: [],
    corrected_code: 'const x = 1;',
    explanation_en: 'Good',
    explanation_urdu: 'Acha',
    suggestions: ['tip'],
    next_topics: ['topic'],
    breakdown: { syntax: 25 },
    processing_time_ms: 1000,
    created_at: '2026-01-01T00:00:00Z',
  }

  render(<ReportPage />)
  expect(screen.getByText(/>> download report/i)).toBeInTheDocument()
})

// TC-055: Clicking download button triggers downloadReport
test('TC-055: clicking download button calls downloadReport', async () => {
  mockPollerIsLoading = false
  mockPollerData = {
    submission_id: 'test-sub-id',
    student_id: 'stu-1',
    assignment_name: 'W1',
    score: 80,
    grade: 'B',
    mistakes: [],
    corrected_code: 'const x = 1;',
    explanation_en: 'Good',
    explanation_urdu: 'Acha',
    suggestions: ['tip'],
    next_topics: ['topic'],
    breakdown: { syntax: 25 },
    processing_time_ms: 1000,
    created_at: '2026-01-01T00:00:00Z',
  }

  render(<ReportPage />)
  const btn = screen.getByRole('button', { name: /download report/i })
  expect(btn).toBeInTheDocument()
  fireEvent.click(btn)
  await new Promise((r) => setTimeout(r, 10))
  expect(mockDownloadReport).toHaveBeenCalledWith('test-sub-id')
})
