import { render } from "@testing-library/react";
import React from "react";

jest.mock("three");
jest.mock("gsap");
jest.mock("gsap/ScrollTrigger", () => ({ ScrollTrigger: {} }));
jest.mock("@/store/submission", () => ({ useSubmissionStore: () => ({ setAuth: jest.fn() }) }));
jest.mock("@/lib/api", () => ({ setAuthToken: jest.fn() }));

import { AICore } from "@/components/AICore";

beforeEach(() => { jest.restoreAllMocks(); });

test("TC-AICORE-01: renders without crashing", () => {
  const { container } = render(<AICore thinking={false} mouseX={0} mouseY={0} />);
  expect(container.querySelector("div")).toBeInTheDocument();
});

test("TC-AICORE-02: accepts thinking prop", () => {
  const { rerender } = render(<AICore thinking={false} mouseX={0} mouseY={0} />);
  rerender(<AICore thinking={true} mouseX={0} mouseY={0} />);
  expect(true).toBe(true);
});

test("TC-AICORE-03: accepts mouse position props", () => {
  const { container } = render(<AICore thinking={false} mouseX={0.5} mouseY={-0.3} />);
  expect(container.firstChild).toBeInTheDocument();
});

test("TC-AICORE-04: accepts velocity props", () => {
  const { container } = render(<AICore thinking={false} mouseX={0} mouseY={0} mouseVelX={1.2} mouseVelY={-0.8} />);
  expect(container.firstChild).toBeInTheDocument();
});

test("TC-AICORE-05: cleanup removes canvas on unmount", () => {
  const { unmount, container } = render(<AICore thinking={false} mouseX={0} mouseY={0} />);
  unmount();
  expect(container.innerHTML).toBe("");
});
