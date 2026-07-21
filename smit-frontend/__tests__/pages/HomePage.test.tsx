import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'

jest.mock("gsap", () => ({
  registerPlugin: jest.fn(),
  timeline: jest.fn(() => ({
    from: jest.fn().mockReturnThis(),
    to: jest.fn().mockReturnThis(),
    fromTo: jest.fn().mockReturnThis(),
    call: jest.fn().mockReturnThis(),
  })),
  context: jest.fn(() => ({ revert: jest.fn() })),
  to: jest.fn(),
}));
jest.mock("gsap/ScrollTrigger", () => ({ ScrollTrigger: {} }));
jest.mock("next/link", () => {
  return function MockLink({ children, href, ...props }: any) {
    return <a href={href} {...props}>{children}</a>;
  };
});
jest.mock("next/dynamic", () => {
  return function mockDynamic(factory: () => Promise<any>, opts: any) {
    function MockComponent() {
      return <div data-testid="hero-scene-mock" />;
    }
    MockComponent.displayName = "HeroScene";
    return MockComponent;
  };
});

import HomePage from '../../app/page'

// TC-001
test('TC-001: renders main heading with role', () => {
  render(<HomePage />)
  const heading = screen.getByRole('heading', { level: 1 })
  expect(heading).toBeInTheDocument()
})

// TC-002
test('TC-002: contains navigation links', () => {
  render(<HomePage />)
  const links = screen.getAllByRole('link')
  expect(links.length).toBeGreaterThan(0)
})

// TC-003
test('TC-003: contains submit link', () => {
  render(<HomePage />)
  const submitLink = screen.getByRole('link', { name: /submit code/i })
  expect(submitLink).toBeInTheDocument()
  expect(submitLink).toHaveAttribute('href', '/submit')
})

// TC-004
test('TC-004: renders without crashing', () => {
  const { container } = render(<HomePage />)
  expect(container).toBeInTheDocument()
})

// TC-005
test('TC-005: displays site title', () => {
  render(<HomePage />)
  const title = screen.getByRole('heading', { level: 1 })
  expect(title).toHaveTextContent(/SYNAPSE/i)
})

// TC-006
test('TC-006: has accessible landmark', () => {
  render(<HomePage />)
  const heading = screen.getByRole('heading', { level: 1 })
  expect(heading.tagName).toBe('H1')
})

// TC-007
test('TC-007: page loads with animation container', () => {
  const { container } = render(<HomePage />)
  expect(container.firstChild).toBeTruthy()
})

// TC-008
test('TC-008: contains call to action section', () => {
  render(<HomePage />)
  const submitLink = screen.getByRole('link', { name: /submit code/i })
  expect(submitLink).toBeInTheDocument()
})

// TC-009
test('TC-009: renders feature cards', () => {
  render(<HomePage />)
  expect(screen.getByText('Code Analysis')).toBeInTheDocument()
  expect(screen.getByText('Instant Grading')).toBeInTheDocument()
  expect(screen.getByText('AI Tutor')).toBeInTheDocument()
  expect(screen.getAllByText('Progress Tracking').length).toBeGreaterThanOrEqual(1)
})

// TC-010
test('TC-010: renders how it works section', () => {
  render(<HomePage />)
  expect(screen.getByText('Upload')).toBeInTheDocument()
  expect(screen.getByText('Analyze')).toBeInTheDocument()
  expect(screen.getByText('Grade')).toBeInTheDocument()
  expect(screen.getByText('Improve')).toBeInTheDocument()
})
