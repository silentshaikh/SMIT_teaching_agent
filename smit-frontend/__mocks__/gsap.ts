const noop = () => {};
const chain = () => ({ to: noop, from: noop, fromTo: noop, call: noop });

const gsapDefault = {
  timeline: () => chain(),
  context: () => ({ revert: noop }),
  to: noop,
  fromTo: noop,
  from: noop,
  registerPlugin: noop,
};

module.exports = {
  __esModule: true,
  default: gsapDefault,
  timeline: gsapDefault.timeline,
  context: gsapDefault.context,
  to: gsapDefault.to,
  registerPlugin: gsapDefault.registerPlugin,
};
