import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { ScoreReveal } from '@/components/ScoreReveal'

// TC-027
test('TC-027: renders without crashing', () => {
  const { container } = render(
    <ScoreReveal score={75} grade="C" breakdown={{ syntax: 20, logic: 25 }} />
  )
  expect(container).toBeInTheDocument()
})

// TC-028
test('TC-028: displays grade letter', () => {
  render(<ScoreReveal score={85} grade="A" breakdown={{}} />)
  expect(screen.getByText('A')).toBeInTheDocument()
})

// TC-029
test('TC-029: displays score number', () => {
  render(<ScoreReveal score={75} grade="C" breakdown={{}} />)
  expect(screen.getByText('0')).toBeInTheDocument()
})

// TC-030
test('TC-030: renders SVG circle elements', () => {
  const { container } = render(
    <ScoreReveal score={90} grade="A" breakdown={{}} />
  )
  const circles = container.querySelectorAll('circle')
  expect(circles.length).toBeGreaterThanOrEqual(2)
})

// TC-031
test('TC-031: renders breakdown tags', () => {
  render(
    <ScoreReveal
      score={80}
      grade="B"
      breakdown={{ syntax: 20, logic: 30 }}
    />
  )
  expect(screen.getByText(/\[syntax: 20\]/)).toBeInTheDocument()
  expect(screen.getByText(/\[logic: 30\]/)).toBeInTheDocument()
})

// TC-032
test('TC-032: renders SVG element', () => {
  const { container } = render(
    <ScoreReveal score={75} grade="C" breakdown={{}} />
  )
  const svg = container.querySelector('svg')
  expect(svg).toBeInTheDocument()
})