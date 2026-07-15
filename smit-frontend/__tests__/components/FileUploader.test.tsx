import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { FileUploader } from '@/components/FileUploader'

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}))

jest.mock('@tanstack/react-query', () => ({
  useMutation: () => ({
    mutate: jest.fn(),
    isPending: false,
  }),
}))

jest.mock('@/lib/api', () => ({
  submitFile: jest.fn(),
}))

jest.mock('@/store/submission', () => {
  const store = {
    setSubmissionId: jest.fn(),
    setStatus: jest.fn(),
    setOriginalCode: jest.fn(),
    setLanguage: jest.fn(),
  }
  const hook = (selector: (s: typeof store) => any) => selector(store)
  return { useSubmissionStore: hook }
})

// TC-020
test('TC-020: renders file input', () => {
  const { container } = render(<FileUploader />)
  const input = container.querySelector('input[type="file"]')
  expect(input).toBeInTheDocument()
})

// TC-021
test('TC-021: renders student ID input', () => {
  render(<FileUploader />)
  const input = screen.getByPlaceholderText(/> SMIT-101/)
  expect(input).toBeInTheDocument()
})

// TC-022
test('TC-022: renders assignment name input', () => {
  render(<FileUploader />)
  const input = screen.getByPlaceholderText(/> CALCULATOR_APP/)
  expect(input).toBeInTheDocument()
})

// TC-023
test('TC-023: renders submit button', () => {
  render(<FileUploader />)
  const button = screen.getByRole('button', { name: /submit/i })
  expect(button).toBeInTheDocument()
})

// TC-024
test('TC-024: shows error for invalid file type', () => {
  const { container } = render(<FileUploader />)
  const input = container.querySelector('input[type="file"]') as HTMLInputElement
  const file = new File(['test'], 'test.txt', { type: 'text/plain' })
  Object.defineProperty(file, 'size', { value: 100 })
  fireEvent.change(input, { target: { files: [file] } })
  expect(screen.getByText(/invalid file type/i)).toBeInTheDocument()
})

// TC-025
test('TC-025: accepts valid .js file', () => {
  const { container } = render(<FileUploader />)
  const input = container.querySelector('input[type="file"]') as HTMLInputElement
  const file = new File(['console.log("hi")'], 'test.js', { type: 'text/javascript' })
  Object.defineProperty(file, 'size', { value: 100 })
  fireEvent.change(input, { target: { files: [file] } })
  expect(screen.queryByText(/invalid file type/i)).not.toBeInTheDocument()
})

// TC-026
test('TC-026: submit button disabled without file', () => {
  render(<FileUploader />)
  const button = screen.getByRole('button', { name: /submit/i })
  expect(button).toBeDisabled()
})