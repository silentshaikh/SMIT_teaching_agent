import axios from "axios";
import type {
  AssignmentReport,
  SubmissionResponse,
  HistoryItem,
  Rubric,
  DashboardStats,
  Assignment,
  Course,
  LoginResponse,
  StudentProgress,
  QAPair,
  ReverifyResponse,
  Badge,
  BatchAnalytics,
  RubricVersionCompare,
  BulkSubmitResult,
} from "./types";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

let authToken: string | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
}

const client = axios.create({
  baseURL: BASE,
  headers: { "Content-Type": "application/json" },
});

client.interceptors.request.use((config) => {
  if (authToken) {
    config.headers.Authorization = `Bearer ${authToken}`;
  }
  return config;
});

client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== "undefined") {
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export async function login(
  email: string,
  password: string
): Promise<LoginResponse> {
  const { data } = await client.post<LoginResponse>("/api/v1/auth/login", {
    email,
    password,
  });
  return data;
}

export async function submitFile(
  file: File,
  assignmentName: string,
  rubricId: string,
  assignmentId?: string
): Promise<SubmissionResponse> {
  const form = new FormData();
  form.append("file", file);
  form.append("assignment_name", assignmentName);
  form.append("rubric_id", rubricId);
  if (assignmentId) {
    form.append("assignment_id", assignmentId);
  }

  const { data } = await client.post<SubmissionResponse>("/api/v1/submit", form);
  return data;
}

export async function fetchAssignments(
  courseId?: string
): Promise<Assignment[]> {
  const params = courseId ? { course_id: courseId } : {};
  const { data } = await client.get<Assignment[]>("/api/v1/assignments", { params });
  return data;
}

export async function fetchCourses(batch?: string): Promise<Course[]> {
  const params = batch ? { batch } : {};
  const { data } = await client.get<Course[]>("/api/v1/courses", { params });
  return data;
}

export async function getReport(
  submissionId: string
): Promise<AssignmentReport> {
  const { data } = await client.get<AssignmentReport>(
    `/api/v1/report/${submissionId}`
  );
  return data;
}

export async function getHistory(
  studentId: string
): Promise<HistoryItem[]> {
  const { data } = await client.get<HistoryItem[]>(
    `/api/v1/history/${studentId}`
  );
  return data;
}

export async function fetchRubrics(): Promise<Rubric[]> {
  const { data } = await client.get<Rubric[]>("/api/v1/rubrics");
  return data;
}

export async function fetchDashboard(
  batch: string
): Promise<DashboardStats> {
  const { data } = await client.get<DashboardStats>(
    `/api/v1/dashboard/${batch}`
  );
  return data;
}

export async function downloadReport(
  submissionId: string
): Promise<AssignmentReport> {
  const { data } = await client.get<AssignmentReport>(
    `/api/v1/report/${submissionId}/download`
  );
  return data;
}

// ── Phase 1 API ────────────────────────────────────

export async function getStudentProgress(
  studentId: string
): Promise<StudentProgress> {
  const { data } = await client.get<StudentProgress>(
    `/api/v1/students/${studentId}/progress`
  );
  return data;
}

export async function askQuestion(
  submissionId: string,
  question: string
): Promise<QAPair> {
  const { data } = await client.post<QAPair>(
    `/api/v1/report/${submissionId}/ask`,
    { question }
  );
  return data;
}

export async function getQAHistory(
  submissionId: string
): Promise<QAPair[]> {
  const { data } = await client.get<QAPair[]>(
    `/api/v1/report/${submissionId}/qa`
  );
  return data;
}

export async function reverifyMistake(
  mistakeId: string,
  correctedSnippet: string
): Promise<ReverifyResponse> {
  const { data } = await client.post<ReverifyResponse>(
    `/api/v1/mistakes/${mistakeId}/reverify`,
    { corrected_snippet: correctedSnippet }
  );
  return data;
}

export async function getBadges(
  studentId: string
): Promise<Badge[]> {
  const { data } = await client.get<Badge[]>(
    `/api/v1/students/${studentId}/badges`
  );
  return data;
}

// ── Phase 2 API ────────────────────────────────────

export async function getBatchAnalytics(
  batch: string,
  params?: { assignment_id?: string; date_from?: string; date_to?: string }
): Promise<BatchAnalytics> {
  const { data } = await client.get<BatchAnalytics>(
    `/api/v1/batches/${batch}/analytics`,
    { params }
  );
  return data;
}

export async function overrideReport(
  submissionId: string,
  newScore: number,
  teacherNote: string
): Promise<{ status: string }> {
  const { data } = await client.patch<{ status: string }>(
    `/api/v1/report/${submissionId}/override`,
    { new_score: newScore, teacher_note: teacherNote }
  );
  return data;
}

export async function compareRubricVersions(
  rubricId: string
): Promise<RubricVersionCompare[]> {
  const { data } = await client.get<RubricVersionCompare[]>(
    `/api/v1/rubrics/${rubricId}/compare`
  );
  return data;
}

export async function bulkSubmit(
  file: File
): Promise<BulkSubmitResult> {
  const form = new FormData();
  form.append("file", file);
  const { data } = await client.post<BulkSubmitResult>(
    "/api/v1/submit/bulk",
    form
  );
  return data;
}

// ── Submission approval API ──────────────────────────

export interface SubmissionListItem {
  id: string;
  student_id: string;
  student_name: string | null;
  assignment_name: string;
  language: string;
  file_name: string;
  status: string;
  approval_status: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  score: number | null;
  grade: string | null;
  created_at: string;
}

export async function fetchSubmissions(
  batch?: string,
  approvalStatus?: string
): Promise<SubmissionListItem[]> {
  const params: Record<string, string> = {};
  if (batch) params.batch = batch;
  if (approvalStatus) params.approval_status = approvalStatus;
  const { data } = await client.get<SubmissionListItem[]>(
    "/api/v1/submissions",
    { params }
  );
  return data;
}

export async function approveSubmission(
  submissionId: string,
  action: "approved" | "rejected",
  note?: string
): Promise<{ submission_id: string; approval_status: string }> {
  const { data } = await client.patch<{
    submission_id: string;
    approval_status: string;
  }>(`/api/v1/submissions/${submissionId}/approve`, {
    action,
    note,
  });
  return data;
}

// ── URL submission API ──────────────────────────────

export async function submitViaUrl(
  url: string,
  assignmentName: string,
  rubricId: string,
  assignmentId?: string
): Promise<SubmissionResponse> {
  const { data } = await client.post<SubmissionResponse>("/api/v1/submit/url", {
    url,
    assignment_name: assignmentName,
    rubric_id: rubricId,
    assignment_id: assignmentId,
  });
  return data;
}

// ── Update submission API ────────────────────────────

export async function updateSubmission(
  submissionId: string,
  opts: { code?: string; url?: string; rubric_id?: string }
): Promise<SubmissionResponse> {
  const { data } = await client.patch<SubmissionResponse>(
    `/api/v1/submissions/${submissionId}`,
    opts
  );
  return data;
}
