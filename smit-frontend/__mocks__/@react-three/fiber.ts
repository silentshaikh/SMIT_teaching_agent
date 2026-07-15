const React = require('react')
module.exports = {
  __esModule: true,
  Canvas: ({ children }) => React.createElement('div', { 'data-testid': 'r3f-canvas' }, children),
  useFrame: jest.fn(),
  useThree: jest.fn(() => ({ gl: {}, scene: {}, camera: {} })),
}
