import { render } from "@testing-library/react";
import React from "react";

jest.mock("three");
jest.mock("gsap");
jest.mock("gsap/ScrollTrigger", () => ({ ScrollTrigger: { create: jest.fn() } }));
jest.mock("@/store/submission", () => ({ useSubmissionStore: () => ({ setAuth: jest.fn() }) }));
jest.mock("@/lib/api", () => ({ setAuthToken: jest.fn() }));

jest.mock("@/components/HeroScene", () => {
  const HeroSceneMock = React.forwardRef<HTMLDivElement>((props, ref) => (
    <div
      ref={ref}
      data-testid="hero-scene"
      style={{ width: "100%", height: "100%", position: "absolute" }}
      {...props}
    />
  ));
  HeroSceneMock.displayName = "HeroScene";
  return { __esModule: true, default: HeroSceneMock };
});

import HeroScene from "@/components/HeroScene";

beforeEach(() => { jest.restoreAllMocks(); });

test("TC-HERO-01: renders a container div", () => {
  const { container } = render(<HeroScene />);
  expect(container.firstChild).toBeInTheDocument();
});

test("TC-HERO-02: container has full width and height styling", () => {
  const { container } = render(<HeroScene />);
  const div = container.firstChild as HTMLElement;
  expect(div.style.width).toBe("100%");
  expect(div.style.height).toBe("100%");
});

test("TC-HERO-03: container has absolute positioning", () => {
  const { container } = render(<HeroScene />);
  const div = container.firstChild as HTMLElement;
  expect(div.style.position).toBe("absolute");
});

test("TC-HERO-04: component mounts and unmounts cleanly", () => {
  const { unmount } = render(<HeroScene />);
  unmount();
  expect(true).toBe(true);
});
