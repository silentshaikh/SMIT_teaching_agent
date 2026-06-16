export type Language = "javascript" | "python" | "html";

export type MistakeType = "syntax" | "logic" | "naming" | "structure" | "style";

export interface MistakeItem {
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
}


