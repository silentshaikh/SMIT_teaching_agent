import '@testing-library/jest-dom'

const mockTimeline = () => {
  const tl: any = {
    to: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    fromTo: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    add: jest.fn().mockReturnThis(),
    duration: jest.fn().mockReturnThis(),
    kill: jest.fn().mockReturnThis(),
  }
  return tl
}

jest.mock('gsap', () => ({
  __esModule: true,
  default: {
    to: jest.fn(() => ({})),
    from: jest.fn(() => ({})),
    fromTo: jest.fn(() => ({})),
    set: jest.fn(),
    context: jest.fn(() => ({ revert: jest.fn() })),
    timeline: jest.fn(() => mockTimeline()),
    registerPlugin: jest.fn(),
    killTweensOf: jest.fn(),
  },
  ScrollTrigger: { register: jest.fn() },
}))

jest.mock('next/link', () => {
  const React = require('react')
  return {
    __esModule: true,
    default: ({ children, href, ...props }: any) =>
      React.createElement('a', { href, ...props }, children),
  }
})

jest.mock('next/dynamic', () => {
  const React = require('react')
  return {
    __esModule: true,
    default: (factory: () => Promise<any>) => {
      const Component = React.lazy(factory)
      return Component
    },
  }
})

beforeEach(() => {
  ;(global as any).IntersectionObserver = class {
    observe() {}
    disconnect() {}
    unobserve() {}
  }
  ;(global as any).window = Object.assign(global.window || {}, {
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    innerWidth: 1024,
  })
})
