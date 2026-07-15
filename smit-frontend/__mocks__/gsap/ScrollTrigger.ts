module.exports = {
  __esModule: true,
  ScrollTrigger: {
    create: jest.fn(() => ({ kill: jest.fn() })),
    register: jest.fn(),
  },
}
