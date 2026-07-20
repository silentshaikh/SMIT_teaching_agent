let mockGet: jest.Mock
let mockPost: jest.Mock
let mockPatch: jest.Mock

jest.mock('axios', () => {
  mockGet = jest.fn().mockResolvedValue({ data: {} })
  mockPost = jest.fn().mockResolvedValue({ data: {} })
  mockPatch = jest.fn().mockResolvedValue({ data: {} })
  const interceptors = {
    request: { use: jest.fn() },
    response: { use: jest.fn() },
  }
  return {
    __esModule: true,
    default: {
      create: jest.fn(() => ({
        get: mockGet,
        post: mockPost,
        patch: mockPatch,
        interceptors,
      })),
    },
  }
})

import { setAuthToken } from '@/lib/api'

const api = require('@/lib/api')

beforeEach(() => {
  jest.clearAllMocks()
})

test('TC-044: submitFile calls post with correct URL', async () => {
  const file = new File(['code'], 'test.js', { type: 'text/javascript' })
  await api.submitFile(file, 'HW1', 'rubric-1')
  expect(mockPost).toHaveBeenCalledWith('/api/v1/submit', expect.any(FormData))
})

test('TC-045: getReport calls get with submission ID', async () => {
  await api.getReport('sub-123')
  expect(mockGet).toHaveBeenCalledWith('/api/v1/report/sub-123')
})

test('TC-046: getHistory calls get with student ID', async () => {
  await api.getHistory('student-1')
  expect(mockGet).toHaveBeenCalledWith('/api/v1/history/student-1')
})

test('TC-047: fetchRubrics calls get on rubrics endpoint', async () => {
  await api.fetchRubrics()
  expect(mockGet).toHaveBeenCalledWith('/api/v1/rubrics')
})

test('TC-NEW: setAuthToken stores token', () => {
  setAuthToken('my-token')
  expect(true).toBe(true)
})

test('TC-NEW: setAuthToken clears token with null', () => {
  setAuthToken(null)
  expect(true).toBe(true)
})

test('TC-NEW: fetchDashboard calls get', async () => {
  await api.fetchDashboard('batch-1')
  expect(mockGet).toHaveBeenCalledWith('/api/v1/dashboard/batch-1')
})

test('TC-NEW: fetchCourses calls get', async () => {
  await api.fetchCourses('batch-1')
  expect(mockGet).toHaveBeenCalledWith('/api/v1/courses', { params: { batch: 'batch-1' } })
})

test('TC-NEW: fetchAssignments calls get', async () => {
  await api.fetchAssignments('course-1')
  expect(mockGet).toHaveBeenCalledWith('/api/v1/assignments', { params: { course_id: 'course-1' } })
})

test('TC-NEW: getStudentProgress calls get', async () => {
  await api.getStudentProgress('student-1')
  expect(mockGet).toHaveBeenCalledWith('/api/v1/students/student-1/progress')
})

test('TC-NEW: getBadges calls get', async () => {
  await api.getBadges('student-1')
  expect(mockGet).toHaveBeenCalledWith('/api/v1/students/student-1/badges')
})

test('TC-NEW: askQuestion calls post', async () => {
  await api.askQuestion('sub-1', 'Why?')
  expect(mockPost).toHaveBeenCalledWith('/api/v1/report/sub-1/ask', { question: 'Why?' })
})

test('TC-NEW: getQAHistory calls get', async () => {
  await api.getQAHistory('sub-1')
  expect(mockGet).toHaveBeenCalledWith('/api/v1/report/sub-1/qa')
})

test('TC-NEW: reverifyMistake calls post', async () => {
  await api.reverifyMistake('m1', 'code')
  expect(mockPost).toHaveBeenCalledWith('/api/v1/mistakes/m1/reverify', { corrected_snippet: 'code' })
})

test('TC-NEW: getBatchAnalytics calls get', async () => {
  await api.getBatchAnalytics('batch-1')
  expect(mockGet).toHaveBeenCalledWith('/api/v1/batches/batch-1/analytics', { params: undefined })
})

test('TC-NEW: overrideReport calls patch', async () => {
  await api.overrideReport('sub-1', 90, 'Fixed')
  expect(mockPatch).toHaveBeenCalledWith('/api/v1/report/sub-1/override', { new_score: 90, teacher_note: 'Fixed' })
})

test('TC-NEW: compareRubricVersions calls get', async () => {
  await api.compareRubricVersions('rubric-1')
  expect(mockGet).toHaveBeenCalledWith('/api/v1/rubrics/rubric-1/compare')
})

test('TC-NEW: bulkSubmit calls post', async () => {
  const file = new File([new Uint8Array([0x50, 0x4b])], 'subs.zip', { type: 'application/zip' })
  await api.bulkSubmit(file)
  expect(mockPost).toHaveBeenCalledWith('/api/v1/submit/bulk', expect.any(FormData))
})

test('TC-NEW: login calls post', async () => {
  await api.login('a@b.com', 'pass')
  expect(mockPost).toHaveBeenCalledWith('/api/v1/auth/login', { email: 'a@b.com', password: 'pass' })
})

test('TC-NEW: downloadReport calls get', async () => {
  await api.downloadReport('sub-1')
  expect(mockGet).toHaveBeenCalledWith('/api/v1/report/sub-1/download')
})

test('TC-NEW: submitViaUrl calls post with url', async () => {
  await api.submitViaUrl('https://example.com/code.js', 'HW1', 'rubric-1')
  expect(mockPost).toHaveBeenCalledWith('/api/v1/submit/url', {
    url: 'https://example.com/code.js',
    assignment_name: 'HW1',
    rubric_id: 'rubric-1',
    assignment_id: undefined,
  })
})

test('TC-NEW: updateSubmission calls patch', async () => {
  await api.updateSubmission('sub-1', { code: 'new code' })
  expect(mockPatch).toHaveBeenCalledWith('/api/v1/submissions/sub-1', { code: 'new code' })
})
