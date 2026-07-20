import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'

jest.mock('next/navigation', () => ({
  useParams: () => ({}),
  useSearchParams: () => new URLSearchParams('batch=SYNAPSE-Batch-42'),
  useRouter: () => ({ push: jest.fn() }),
}))

jest.mock('gsap', () => ({
  context: (fn: () => void) => { fn(); return { revert: jest.fn() } },
  timeline: () => ({
    fromTo: jest.fn().mockReturnThis(),
  }),
  fromTo: jest.fn(),
}))

jest.mock('@/lib/api', () => ({
  fetchDashboard: jest.fn(),
  getBatchAnalytics: jest.fn(),
}))

let mockDashboardData: any = undefined
let mockAnalyticsData: any = undefined
let mockQueryIsLoading = true

jest.mock('@tanstack/react-query', () => ({
  useQuery: ({ queryKey }: { queryKey: string[] }) => {
    const isAnalytics = queryKey[0] === "analytics"
    return {
      data: isAnalytics ? mockAnalyticsData : mockDashboardData,
      isLoading: mockQueryIsLoading,
      enabled: true,
    }
  },
}))

import DashboardPage from '../../app/(teacher)/dashboard/page'

beforeEach(() => {
  mockDashboardData = undefined
  mockAnalyticsData = undefined
  mockQueryIsLoading = true
})

// TC-056: Dashboard shows loading state while fetching
test('TC-056: shows loading state while fetching dashboard data', () => {
  mockQueryIsLoading = true
  render(<DashboardPage />)
  expect(screen.getByText(/compiling batch telemetry/i)).toBeInTheDocument()
})

// TC-057: Dashboard shows empty state when no students
test('TC-057: shows empty state when total_students is 0', () => {
  mockQueryIsLoading = false
  mockDashboardData = {
    batch: 'SYNAPSE-Batch-42',
    total_students: 0,
    total_submissions: 0,
    average_score: 0,
    grade_distribution: {},
    courses: [],
  }

  render(<DashboardPage />)
  expect(screen.getByText(/no students in this batch yet/i)).toBeInTheDocument()
})

// TC-058: Dashboard shows stat grid when data is populated
test('TC-058: shows stat grid when data is populated', () => {
  mockQueryIsLoading = false
  mockDashboardData = {
    batch: 'SYNAPSE-Batch-42',
    total_students: 5,
    total_submissions: 10,
    average_score: 78,
    grade_distribution: { A: 2, B: 3 },
    courses: [],
  }

  render(<DashboardPage />)
  expect(screen.getByText('Students')).toBeInTheDocument()
  expect(screen.getByText('Submissions')).toBeInTheDocument()
  expect(screen.getByText('Avg Score')).toBeInTheDocument()
})

// TC-059: Dashboard shows grade distribution when data is populated
test('TC-059: shows grade distribution when data is populated', () => {
  mockQueryIsLoading = false
  mockDashboardData = {
    batch: 'SYNAPSE-Batch-42',
    total_students: 5,
    total_submissions: 10,
    average_score: 78,
    grade_distribution: { A: 2, B: 3 },
    courses: [],
  }

  render(<DashboardPage />)
  expect(screen.getByText(/grade distribution/i)).toBeInTheDocument()
  expect(screen.getByText('A')).toBeInTheDocument()
  expect(screen.getByText('B')).toBeInTheDocument()
})

// TC-060: Dashboard does not show loading state after data resolves
test('TC-060: does not show loading after data resolves', () => {
  mockQueryIsLoading = false
  mockDashboardData = {
    batch: 'SYNAPSE-Batch-42',
    total_students: 5,
    total_submissions: 10,
    average_score: 78,
    grade_distribution: {},
    courses: [],
  }

  render(<DashboardPage />)
  expect(screen.queryByText(/compiling batch telemetry/i)).not.toBeInTheDocument()
})

// TC-061: Dashboard renders header
test('TC-061: renders dashboard header', () => {
  render(<DashboardPage />)
  expect(screen.getByText('Class Dashboard')).toBeInTheDocument()
})
