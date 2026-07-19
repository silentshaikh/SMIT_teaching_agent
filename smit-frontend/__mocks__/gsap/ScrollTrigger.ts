const noop = () => {};
const noopObj = () => ({});
const ScrollTriggerMock = {
  create: () => ({ kill: noop }),
  getAll: () => [],
  refresh: noop,
};
module.exports = { ScrollTrigger: ScrollTriggerMock };
