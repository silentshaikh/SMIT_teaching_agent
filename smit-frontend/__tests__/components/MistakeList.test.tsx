import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { MistakeList } from '@/components/MistakeList'
import type { MistakeItem } from '@/lib/types'

jest.mock('@tanstack/react-query', () => ({
  useMutation: () => ({
    mutate: jest.fn(),
    isPending: false,
    isError: false,
    error: null,
  }),
}))

jest.mock('@/lib/api', () => ({
  reverifyMistake: jest.fn(),
}))

// TC-033
test('TC-033: renders empty state for no mistakes', () => {
  render(<MistakeList mistakes={[]} />)
  expect(screen.getByText(/no anomalies detected/i)).toBeInTheDocument()
})

// TC-034
test('TC-034: renders single mistake', () => {
  const mistakes: MistakeItem[] = [
    {
      id: 'm1',
      type: 'syntax',
      line: 5,
      description: 'Missing semicolon',
      description_urdu: 'سیمیکولن غائب ہے',
      corrected_snippet: 'let x = 5;',
    },
  ]
  render(<MistakeList mistakes={mistakes} />)
  expect(screen.getByText('Missing semicolon')).toBeInTheDocument()
  expect(screen.getByText('سیمیکولن غائب ہے')).toBeInTheDocument()
})

// TC-035
test('TC-035: renders mistake type badge', () => {
  const mistakes: MistakeItem[] = [
    {
      id: 'm2',
      type: 'logic',
      line: 10,
      description: 'Wrong condition',
      description_urdu: 'غلط شرط',
      corrected_snippet: null,
    },
  ]
  render(<MistakeList mistakes={mistakes} />)
  expect(screen.getByText('LOGIC')).toBeInTheDocument()
})

// TC-036
test('TC-036: renders line number', () => {
  const mistakes: MistakeItem[] = [
    {
      id: 'm3',
      type: 'naming',
      line: 42,
      description: 'Bad variable name',
      description_urdu: 'خراب نام',
      corrected_snippet: null,
    },
  ]
  render(<MistakeList mistakes={mistakes} />)
  expect(screen.getByText('Ln 42')).toBeInTheDocument()
})

// TC-037
test('TC-037: renders corrected snippet when present', () => {
  const mistakes: MistakeItem[] = [
    {
      id: 'm4',
      type: 'syntax',
      line: 3,
      description: 'Error',
      description_urdu: 'خرابی',
      corrected_snippet: 'const x = 10;',
    },
  ]
  render(<MistakeList mistakes={mistakes} />)
  expect(screen.getByText('const x = 10;')).toBeInTheDocument()
})

// TC-038
test('TC-038: renders multiple mistakes', () => {
  const mistakes: MistakeItem[] = [
    { id: 'm5', type: 'syntax', line: 1, description: 'Err1', description_urdu: 'خرابی1', corrected_snippet: null },
    { id: 'm6', type: 'logic', line: 2, description: 'Err2', description_urdu: 'خرابی2', corrected_snippet: null },
    { id: 'm7', type: 'style', line: 3, description: 'Err3', description_urdu: 'خرابی3', corrected_snippet: null },
  ]
  render(<MistakeList mistakes={mistakes} />)
  expect(screen.getByText('Err1')).toBeInTheDocument()
  expect(screen.getByText('Err2')).toBeInTheDocument()
  expect(screen.getByText('Err3')).toBeInTheDocument()
})
