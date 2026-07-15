import { submitFile, getReport, getHistory, fetchRubrics } from '@/lib/api'

jest.mock('axios', () => {
  const mockPost = jest.fn()
  const mockGet = jest.fn()
  return {
    __esModule: true,
    default: {
      create: jest.fn(() => ({
        post: mockPost,
        get: mockGet,
        interceptors: {
          request: { use: jest.fn() },
          response: { use: jest.fn() },
        },
      })),
      post: mockPost,
      get: mockGet,
    },
  }
})

const getAxiosInstance = () => {
  const axios = require('axios').default
  return axios.create()
}

beforeEach(() => {
  jest.clearAllMocks()
})

// TC-044
test('TC-044: submitFile calls post with correct URL', async () => {
  const instance = getAxiosInstance()
  instance.post.mockResolvedValueOnce({ data: { submission_id: '123', status: 'processing', poll_url: '/poll' } })
  const file = new File(['code'], 'test.js', { type: 'text/javascript' })
  await submitFile(file, 'S001', 'HW1', 'default')
  expect(instance.post).toHaveBeenCalledWith('/api/v1/submit', expect.any(FormData))
})

// TC-045
test('TC-045: getReport calls get with submission ID', async () => {
  const instance = getAxiosInstance()
  instance.get.mockResolvedValueOnce({ data: { score: 80 } })
  await getReport('sub-123')
  expect(instance.get).toHaveBeenCalledWith('/api/v1/report/sub-123')
})

// TC-046
test('TC-046: getHistory calls get with student ID', async () => {
  const instance = getAxiosInstance()
  instance.get.mockResolvedValueOnce({ data: [] })
  await getHistory('S001')
  expect(instance.get).toHaveBeenCalledWith('/api/v1/history/S001')
})

// TC-047
test('TC-047: fetchRubrics calls get on rubrics endpoint', async () => {
  const instance = getAxiosInstance()
  instance.get.mockResolvedValueOnce({ data: [] })
  await fetchRubrics()
  expect(instance.get).toHaveBeenCalledWith('/api/v1/rubrics')
})