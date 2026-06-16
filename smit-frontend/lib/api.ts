import axios from "axios";
import type {
  AssignmentReport,
  SubmissionResponse,
  HistoryItem,
  Rubric,
  DashboardStats,
} from "./types";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const client = axios.create({ baseURL: BASE });

export async function submitFile(
  file: File,
  studentId: string,
  assignmentName: string,
  rubricId: string
): Promise<SubmissionResponse> {
  const form = new FormData();
  form.append("file", file);
  form.append("student_id", studentId);
  form.append("assignment_name", assignmentName);
  form.append("rubric_id", rubricId);

  const { data } = await client.post<SubmissionResponse>("/api/v1/submit", form);
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
