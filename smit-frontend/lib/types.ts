export type Language = "javascript" | "python" | "html";

export type MistakeType = "syntax" | "logic" | "naming" | "structure" | "style";

export interface MistakeItem {
  id: string;
  line: number | null;
  type: MistakeType;
  description: string;
  description_urdu: string;
  corrected_snippet: string | null;
}

export interface AssignmentReport {
  submission_id: string;
  student_id: string;
  assignment_name: string;
  score: number;
  grade: string;
  mistakes: MistakeItem[];
  corrected_code: string;
  explanation_en: string;
  explanation_urdu: string;
  suggestions: string[];
  next_topics: string[];
  breakdown: Record<string, number>;
  processing_time_ms: number;
  created_at: string;
  status?: "processing" | "complete" | "failed";
  override_score?: number;
  override_note?: string;
  overridden_by?: string;
  overridden_at?: string;
}

export interface SubmissionResponse {
  submission_id: string;
  status: "processing" | "complete" | "error";
  poll_url: string;
}

export interface Student {
  id: string;
  name: string;
  email: string;
  batch: string;
  created_at: string;
}

export interface HistoryItem {
  submission_id: string;
  assignment_name: string;
  language: string;
  score: number | null;
  grade: string | null;
  status: string;
  course_name: string | null;
  created_at: string;
}

export interface Rubric {
  id: string;
  assignment_name: string;
  language: string;
  criteria: Record<string, number>;
  max_score: number;
  created_by: string;
}

export interface DashboardStats {
  batch: string;
  total_students: number;
  total_submissions: number;
  average_score: number;
  grade_distribution: Record<string, number>;
  courses: CourseStats[];
}

export interface CourseStats {
  course_id: string;
  course_name: string;
  total_submissions: number;
  average_score: number;
}

export interface Assignment {
  id: string;
  course_id: string;
  name: string;
  rubric_id: string | null;
  due_date: string | null;
  created_at: string;
}

export interface Course {
  id: string;
  name: string;
  batch: string;
  created_at: string;
}

export interface LoginResponse {
  token: string;
  role: "student" | "teacher";
  user_id: string;
  name: string;
}

// ── Phase 1 types ──────────────────────────────────

export interface ProgressPoint {
  submission_id: string;
  created_at: string;
  score: number | null;
  grade: string | null;
}

export interface MistakeFrequency {
  type: string;
  count: number;
}

export interface StudentProgress {
  student_id: string;
  time_series: ProgressPoint[];
  mistake_type_frequency: MistakeFrequency[];
}

export interface QAPair {
  question: string;
  answer_en: string;
  answer_urdu: string;
  created_at: string;
}

export interface ReverifyResponse {
  passed: boolean;
  note: string;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  earned: boolean;
}

// ── Phase 2 types ──────────────────────────────────

export interface BatchMistakeStat {
  type: string;
  count: number;
  percentage: number;
}

export interface BatchAnalytics {
  batch: string;
  total_submissions: number;
  average_score: number;
  mistake_stats: BatchMistakeStat[];
  assignment_filter: string | null;
  date_from: string | null;
  date_to: string | null;
}

export interface RubricVersionCompare {
  version_id: string;
  version_number: number;
  created_by: string;
  created_at: string;
  average_score: number;
  submission_count: number;
}

export interface BulkSubmitResult {
  total: number;
  submitted: number;
  failed: number;
  results: Array<{ file: string; status: string; reason?: string; submission_id?: string }>;
}
