import type { MistakeItem, AssignmentReport, SubmissionResponse } from '@/lib/types'

// TC-048
test('TC-048: MistakeItem has required fields', () => {
  const item: MistakeItem = {
    id: 'm1',
    type: 'syntax',
    line: 5,
    description: 'test',
    description_urdu: 'ٹیسٹ',
    corrected_snippet: null,
  }
  expect(item.type).toBe('syntax')
  expect(item.line).toBe(5)
  expect(item.description).toBe('test')
  expect(item.description_urdu).toBe('ٹیسٹ')
  expect(item.corrected_snippet).toBeNull()
})

// TC-049
test('TC-049: AssignmentReport has required fields', () => {
  const report: AssignmentReport = {
    submission_id: 's1',
    student_id: 'st1',
    assignment_name: 'hw1',
    score: 80,
    grade: 'B',
    mistakes: [],
    corrected_code: 'code',
    explanation_en: 'en',
    explanation_urdu: 'ur',
    suggestions: [],
    next_topics: [],
    breakdown: {},
    processing_time_ms: 100,
    created_at: '2026-01-01',
  }
  expect(report.submission_id).toBe('s1')
  expect(report.score).toBe(80)
  expect(report.grade).toBe('B')
  expect(typeof report.mistakes).toBe('object')
})

// TC-050
test('TC-050: SubmissionResponse has required fields', () => {
  const resp: SubmissionResponse = {
    submission_id: 's1',
    status: 'processing',
    poll_url: '/api/v1/report/s1',
  }
  expect(resp.submission_id).toBe('s1')
  expect(['processing', 'complete', 'error']).toContain(resp.status)
  expect(resp.poll_url).toBe('/api/v1/report/s1')
})