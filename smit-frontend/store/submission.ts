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
  studentId: string;
  assignmentName: string;
  rubricId: string;
  token: string | null;
  role: "student" | "teacher" | null;
  userId: string | null;
  setSubmissionId: (id: string | null) => void;
  setStatus: (status: SubmissionStatus) => void;
  setReport: (report: AssignmentReport | null) => void;
  setError: (error: string | null) => void;
  setOriginalCode: (code: string) => void;
  setLanguage: (language: string) => void;
  setStudentId: (studentId: string) => void;
  setAssignmentName: (assignmentName: string) => void;
  setRubricId: (rubricId: string) => void;
  setAuth: (token: string, role: "student" | "teacher", userId: string) => void;
  reset: () => void;
}

const initialState = {
  submissionId: null,
  status: "idle" as const,
  report: null,
  error: null,
  originalCode: "",
  language: "javascript",
  studentId: "",
  assignmentName: "",
  rubricId: "default",
  token: null,
  role: null,
  userId: null,
};

export const useSubmissionStore = create<SubmissionState>((set) => ({
  ...initialState,
  setSubmissionId: (submissionId) => set({ submissionId }),
  setStatus: (status) => set({ status }),
  setReport: (report) => set({ report }),
  setError: (error) => set({ error }),
  setOriginalCode: (originalCode) => set({ originalCode }),
  setLanguage: (language) => set({ language }),
  setStudentId: (studentId) => set({ studentId }),
  setAssignmentName: (assignmentName) => set({ assignmentName }),
  setRubricId: (rubricId) => set({ rubricId }),
  setAuth: (token, role, userId) => set({ token, role, userId }),
  reset: () => set(initialState),
}));
