import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import RegisterPage from "@/app/(auth)/register/page";
import React from "react";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock("@/store/submission", () => ({
  useSubmissionStore: () => ({
    setAuth: jest.fn(),
  }),
}));

jest.mock("@/lib/api", () => ({
  setAuthToken: jest.fn(),
}));

beforeEach(() => {
  jest.restoreAllMocks();
});

test("TC-REG-FE-01: renders create account heading", () => {
  render(<RegisterPage />);
  expect(screen.getByRole("heading", { name: /Create Account/i })).toBeInTheDocument();
});

test("TC-REG-FE-02: renders all input fields", () => {
  render(<RegisterPage />);
  expect(screen.getByPlaceholderText(/your name/i)).toBeInTheDocument();
  expect(screen.getByPlaceholderText(/@smit.edu/i)).toBeInTheDocument();
  expect(screen.getByPlaceholderText(/min 6/i)).toBeInTheDocument();
});

test("TC-REG-FE-03: student role shows batch field", () => {
  render(<RegisterPage />);
  expect(screen.getByPlaceholderText(/Fall 2026/i)).toBeInTheDocument();
});

test("TC-REG-FE-04: teacher role hides batch field", () => {
  render(<RegisterPage />);
  const teacherBtn = screen.getByRole("button", { name: /teacher/i });
  fireEvent.click(teacherBtn);
  expect(screen.queryByPlaceholderText(/Fall 2026/i)).not.toBeInTheDocument();
});

test("TC-REG-FE-05: shows error on failed registration", async () => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: false,
    json: () => Promise.resolve({ detail: "Email already registered" }),
  });

  render(<RegisterPage />);
  fireEvent.change(screen.getByPlaceholderText(/your name/i), { target: { value: "Test" } });
  fireEvent.change(screen.getByPlaceholderText(/@smit.edu/i), { target: { value: "x@y.com" } });
  fireEvent.change(screen.getByPlaceholderText(/min 6/i), { target: { value: "pass123" } });
  fireEvent.change(screen.getByPlaceholderText(/Fall 2026/i), { target: { value: "Batch-1" } });

  fireEvent.click(screen.getByRole("button", { name: /sign up/i }));

  await waitFor(() => {
    expect(screen.getByText(/Email already registered/i)).toBeInTheDocument();
  });
});

test("TC-REG-FE-06: shows network error on fetch failure", async () => {
  global.fetch = jest.fn().mockRejectedValue(new Error("fail"));

  render(<RegisterPage />);
  fireEvent.change(screen.getByPlaceholderText(/your name/i), { target: { value: "Test" } });
  fireEvent.change(screen.getByPlaceholderText(/@smit.edu/i), { target: { value: "x@y.com" } });
  fireEvent.change(screen.getByPlaceholderText(/min 6/i), { target: { value: "pass123" } });
  fireEvent.change(screen.getByPlaceholderText(/Fall 2026/i), { target: { value: "B1" } });

  fireEvent.click(screen.getByRole("button", { name: /sign up/i }));

  await waitFor(() => {
    expect(screen.getByText(/network error/i)).toBeInTheDocument();
  });
});
