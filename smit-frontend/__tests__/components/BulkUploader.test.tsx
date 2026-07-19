import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { BulkUploader } from '@/components/BulkUploader'

jest.mock('@tanstack/react-query', () => ({
  useMutation: () => ({
    mutate: jest.fn(),
    isPending: false,
    data: undefined,
  }),
}))

jest.mock('@/lib/api', () => ({
  bulkSubmit: jest.fn(),
}))

test('TC-BULK-01: renders drop zone', () => {
  render(<BulkUploader />)
  expect(screen.getByText(/drop a .zip/i)).toBeInTheDocument()
})

test('TC-BULK-02: renders submit button', () => {
  render(<BulkUploader />)
  const button = screen.getByRole('button', { name: /bulk submit/i })
  expect(button).toBeInTheDocument()
  expect(button).toBeDisabled()
})

test('TC-BULK-03: shows error for non-zip file', () => {
  const { container } = render(<BulkUploader />)
  const input = container.querySelector('input[type="file"]') as HTMLInputElement
  const file = new File(['test'], 'test.txt', { type: 'text/plain' })
  fireEvent.change(input, { target: { files: [file] } })
  expect(screen.getByText(/invalid file type/i)).toBeInTheDocument()
})

test('TC-BULK-04: accepts valid zip file', () => {
  const { container } = render(<BulkUploader />)
  const input = container.querySelector('input[type="file"]') as HTMLInputElement
  const file = new File([new Uint8Array([0x50, 0x4b])], 'submissions.zip', { type: 'application/zip' })
  fireEvent.change(input, { target: { files: [file] } })
  expect(screen.queryByText(/invalid file type/i)).not.toBeInTheDocument()
})

test('TC-BULK-05: button enabled after zip selected', () => {
  const { container } = render(<BulkUploader />)
  const input = container.querySelector('input[type="file"]') as HTMLInputElement
  const file = new File([new Uint8Array([0x50, 0x4b])], 'subs.zip', { type: 'application/zip' })
  fireEvent.change(input, { target: { files: [file] } })
  const button = screen.getByRole('button', { name: /bulk submit/i })
  expect(button).not.toBeDisabled()
})
