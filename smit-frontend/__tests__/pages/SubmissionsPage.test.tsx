import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

jest.mock("@/lib/api", () => ({
  fetchSubmissions: jest.fn().mockResolvedValue([]),
  approveSubmission: jest.fn().mockResolvedValue({}),
}));

import SubmissionsPage from "@/app/(teacher)/submissions/page";

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
  );
}

describe("SubmissionsPage", () => {
  it("renders the page title", async () => {
    renderWithProviders(<SubmissionsPage />);
    expect(screen.getByText(/Student Submissions/)).toBeInTheDocument();
  });

  it("shows loading state", async () => {
    renderWithProviders(<SubmissionsPage />);
    expect(screen.getByText(/Loading submissions/)).toBeInTheDocument();
  });

  it("renders filter toggles", async () => {
    renderWithProviders(<SubmissionsPage />);
    expect(screen.getByText("All")).toBeInTheDocument();
    expect(screen.getByText("Pending")).toBeInTheDocument();
    expect(screen.getByText("Approved")).toBeInTheDocument();
    expect(screen.getByText("Rejected")).toBeInTheDocument();
  });
});
