import { render, screen } from "@testing-library/react";
import React from "react";

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

jest.mock("gsap", () => ({
  timeline: jest.fn(() => ({
    from: jest.fn().mockReturnThis(),
    to: jest.fn().mockReturnThis(),
    fromTo: jest.fn().mockReturnThis(),
    call: jest.fn().mockReturnThis(),
  })),
  context: jest.fn(() => ({ revert: jest.fn() })),
  to: jest.fn(),
}));

import { CyberUI } from "@/components/CyberUI";

beforeEach(() => {
  jest.restoreAllMocks();
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

test("TC-CYBERUI-01: renders without crashing", () => {
  const { container } = render(<CyberUI />);
  expect(container.firstChild).toBeInTheDocument();
});

test("TC-CYBERUI-02: renders title text", () => {
  render(<CyberUI />);
  expect(screen.getByText(/SMIT \/\/ AI TEACHING CORE/)).toBeInTheDocument();
});

test("TC-CYBERUI-03: renders subtitle text", () => {
  render(<CyberUI />);
  expect(screen.getByText(/AGENTIC CODE ANALYSIS ENGINE/)).toBeInTheDocument();
});

test("TC-CYBERUI-04: renders submit and history links", () => {
  render(<CyberUI />);
  expect(screen.getByText("[ SUBMIT CODE ]")).toBeInTheDocument();
  expect(screen.getByText("[ VIEW HISTORY ]")).toBeInTheDocument();
});

test("TC-CYBERUI-05: links have correct hrefs", () => {
  render(<CyberUI />);
  const submitLink = screen.getByText("[ SUBMIT CODE ]").closest("a");
  const historyLink = screen.getByText("[ VIEW HISTORY ]").closest("a");
  expect(submitLink).toHaveAttribute("href", "/submit");
  expect(historyLink).toHaveAttribute("href", "/history");
});

test("TC-CYBERUI-06: renders children", () => {
  render(
    <CyberUI>
      <div data-testid="child">Child content</div>
    </CyberUI>
  );
  expect(screen.getByTestId("child")).toBeInTheDocument();
});

test("TC-CYBERUI-07: renders boot screen", () => {
  render(<CyberUI />);
  expect(screen.getByText("BOOT")).toBeInTheDocument();
});

test("TC-CYBERUI-08: has mouse move handler", () => {
  const { container } = render(<CyberUI />);
  const root = container.firstChild as HTMLElement;
  expect(root.onmousemove).toBeDefined();
});
