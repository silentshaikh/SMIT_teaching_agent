import { create } from "zustand";
import type { AssignmentReport } from "@/lib/types";

export type SubmissionStatus = "idle" | "processing" | "complete" | "error";

interface SubmissionState {
  submissionId: string | null;
  status: SubmissionStatus;
  report: AssignmentReport | null;
  error: string | null;
  originalCode: string;
  language: string;
  setSubmissionId: (id: string | null) => void;
  setStatus: (status: SubmissionStatus) => void;
  setReport: (report: AssignmentReport | null) => void;
  setError: (error: string | null) => void;
  setOriginalCode: (code: string) => void;
  setLanguage: (language: string) => void;
  reset: () => void;
}

const initialState = {
  submissionId: null,
  status: "idle" as const,
  report: null,
  error: null,
  originalCode: "",
  language: "javascript",
};

export const useSubmissionStore = create<SubmissionState>((set) => ({
  ...initialState,
  setSubmissionId: (submissionId) => set({ submissionId }),
  setStatus: (status) => set({ status }),
  setReport: (report) => set({ report }),
  setError: (error) => set({ error }),
  setOriginalCode: (originalCode) => set({ originalCode }),
  setLanguage: (language) => set({ language }),
  reset: () => set(initialState),
}));
