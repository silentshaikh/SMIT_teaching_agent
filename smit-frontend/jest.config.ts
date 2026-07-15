import type { Config } from 'jest'
const config: Config = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '\\.(jpg|jpeg|png|gif|webp|avif|ico|bmp|svg)$': '<rootDir>/__mocks__/fileMock.ts',
    '^three$': '<rootDir>/__mocks__/three.ts',
    '^@react-three/fiber$': '<rootDir>/__mocks__/@react-three/fiber.ts',
    '^@react-three/drei$': '<rootDir>/__mocks__/@react-three/drei.ts',
    '^gsap/ScrollTrigger$': '<rootDir>/__mocks__/gsap/ScrollTrigger.ts',
  },
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', { tsconfig: { jsx: 'react-jsx' } }],
  },
  testMatch: ['**/__tests__/**/*.test.(ts|tsx)', '**/tests/**/*.test.(ts|tsx)'],
}
export default config
