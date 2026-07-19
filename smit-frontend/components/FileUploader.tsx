"use client";

import { useState, useCallback, type ChangeEvent, type DragEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { submitFile, fetchAssignments, fetchRubrics, getHistory } from "@/lib/api";
import { useSubmissionStore } from "@/store/submission";
import type { SubmissionResponse, Rubric, HistoryItem } from "@/lib/types";

const ALLOWED_EXTENSIONS = [".js", ".py", ".html"];
const MAX_SIZE = 50 * 1024;

const LANG_COLORS: Record<string, string> = {
  javascript: "bg-yellow-400",
  python: "bg-blue-400",
  html: "bg-orange-400",
};

export function FileUploader() {
  const router = useRouter();
  const setSubmissionId = useSubmissionStore((s) => s.setSubmissionId);
  const setStatus = useSubmissionStore((s) => s.setStatus);
  const setOriginalCode = useSubmissionStore((s) => s.setOriginalCode);
  const setLanguage = useSubmissionStore((s) => s.setLanguage);
  const storeSetStudentId = useSubmissionStore((s) => s.setStudentId);
  const storeSetAssignmentName = useSubmissionStore((s) => s.setAssignmentName);
  const storeSetRubricId = useSubmissionStore((s) => s.setRubricId);

  const [file, setFile] = useState<File | null>(null);
  const [fileContent, setFileContent] = useState("");
  const [studentId, setStudentId] = useState("");
  const [selectedAssignmentId, setSelectedAssignmentId] = useState("");
  const [rubricId, setRubricId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [previewLang, setPreviewLang] = useState("javascript");

  const { data: assignments } = useQuery({
    queryKey: ["assignments"],
    queryFn: () => fetchAssignments(),
  });

  const { data: rubrics } = useQuery({
    queryKey: ["rubrics"],
    queryFn: () => fetchRubrics(),
  });

  const userId = useSubmissionStore((s) => s.userId);
  const { data: recentSubmissions } = useQuery({
    queryKey: ["history", userId],
    queryFn: () => getHistory(userId!),
    enabled: !!userId,
  });

  const selectedAssignment = assignments?.find((a) => a.id === selectedAssignmentId);
  const selectedRubric = rubrics?.find((r) => r.id === rubricId);

  const processFile = useCallback(
    (f: File) => {
      const ext = "." + f.name.split(".").pop()?.toLowerCase();
      if (!ALLOWED_EXTENSIONS.includes(ext)) {
        setError(`! INVALID FILE TYPE [${ext}] — ALLOWED: ${ALLOWED_EXTENSIONS.join(", ")}`);
        return;
      }
      if (f.size > MAX_SIZE) {
        setError(`! FILE OVERFLOW [${(f.size / 1024).toFixed(1)}KB] — MAX: 50KB`);
        return;
      }
      setFile(f);
      const lang = f.name.endsWith(".py") ? "python" : f.name.endsWith(".html") ? "html" : "javascript";
      setLanguage(lang);
      setPreviewLang(lang);
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          setOriginalCode(reader.result);
          setFileContent(reader.result);
        }
      };
      reader.readAsText(f);
    },
    [setOriginalCode, setLanguage]
  );

  const handleFileChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      setError(null);
      setIsDragOver(false);
      const f = e.target.files?.[0];
      if (f) processFile(f);
    },
    [processFile]
  );

  const handleDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const f = e.dataTransfer.files[0];
      if (f) processFile(f);
    },
    [processFile]
  );

  const mutation = useMutation({
    mutationFn: () =>
      submitFile(
        file!,
        studentId,
        selectedAssignment?.name ?? "",
        rubricId || "default",
        selectedAssignmentId || undefined
      ),
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!file || !studentId || !selectedAssignmentId) {
      setError("! MISSING REQUIRED FIELDS");
      return;
    }
    setShowConfirm(true);
  };

  const confirmSubmit = () => {
    setShowConfirm(false);
    mutation.mutate(undefined, {
      onSuccess: (data: SubmissionResponse) => {
        setSubmissionId(data.submission_id);
        setStatus("processing");
        storeSetStudentId(studentId);
        storeSetAssignmentName(selectedAssignment?.name ?? "");
        storeSetRubricId(rubricId);
        router.push(`/report/${data.submission_id}`);
      },
      onError: (err: Error) => {
        setError(err instanceof Error ? `! SUBMISSION FAILED: ${err.message}` : "! UNKNOWN ERROR");
      },
    });
  };

  const recent = recentSubmissions?.slice(0, 5) ?? [];

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="border border-cyber-crimson bg-cyber-crimson/10 p-4 flex items-center gap-3">
            <span className="text-cyber-crimson font-michroma text-sm">&gt;&gt;</span>
            <span className="font-syncopate text-[10px] tracking-widest text-cyber-crimson uppercase flex-1">
              {error}
            </span>
          </div>
        )}

        {/* File upload */}
        <div>
          <label className="block mb-2">Code File *</label>
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            className={`relative border-2 border-dashed transition-all duration-200 cursor-pointer hover:border-cyber-green hover:scale-[1.01] ${
              isDragOver
                ? "border-cyber-green bg-cyber-green/5 border-solid"
                : "border-white/10"
            }`}
            style={{ height: "clamp(120px, 15vw, 180px)" }}
          >
            <input
              type="file"
              accept=".js,.py,.html"
              onChange={handleFileChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <div className="flex flex-col items-center justify-center h-full gap-2 p-4 text-center">
              <svg className="w-8 h-8 text-cyber-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
              </svg>
              <p className="font-body text-sm text-white/60">
                {file ? file.name : "Drag & drop or click to upload"}
              </p>
              {file && (
                <p className="font-space-mono text-[10px] text-cyber-green/50">
                  {(file.size / 1024).toFixed(1)}KB
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Code preview */}
        {fileContent && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block">Code Preview</label>
              <span className={`w-2 h-2 ${LANG_COLORS[previewLang]}`} />
            </div>
            <pre className="bg-black/40 border border-white/10 p-4 overflow-auto max-h-64 text-xs font-space-mono text-cyber-green/80 leading-relaxed">
              <code>{fileContent}</code>
            </pre>
          </div>
        )}

        {/* Student ID */}
        <div>
          <label className="block mb-2">Student ID *</label>
          <input
            type="text"
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            className="cyber-input"
            placeholder="> SMIT-101"
            required
          />
        </div>

        {/* Assignment */}
        <div>
          <label className="block mb-2">Assignment *</label>
          <select
            value={selectedAssignmentId}
            onChange={(e) => {
              setSelectedAssignmentId(e.target.value);
              const a = assignments?.find((x) => x.id === e.target.value);
              if (a?.rubric_id) setRubricId(a.rubric_id);
            }}
            className="cyber-input"
            required
          >
            <option value="">-- Select Assignment --</option>
            {assignments?.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
          {assignments && assignments.length === 0 && (
            <p className="font-space-mono text-[10px] text-cyber-green/40 mt-1">
              // No assignments available — ask your teacher to create one
            </p>
          )}
        </div>

        {/* Rubric selector */}
        <div>
          <label className="block mb-2">Rubric</label>
          <select
            value={rubricId}
            onChange={(e) => setRubricId(e.target.value)}
            className="cyber-input"
          >
            <option value="">-- Select Rubric --</option>
            {rubrics?.map((r) => (
              <option key={r.id} value={r.id}>
                {r.assignment_name} ({r.max_score} pts)
              </option>
            ))}
          </select>
        </div>

        {/* Rubric criteria display */}
        {selectedRubric && (
          <div className="border border-cyber-purple/30 bg-cyber-purple/5 p-4 space-y-2">
            <h4 className="font-heading text-sm text-cyber-purple">
              Grading Criteria — {selectedRubric.assignment_name}
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(selectedRubric.criteria).map(([name, pts]) => (
                <div key={name} className="flex justify-between text-xs">
                  <span className="text-white/60 capitalize">{name}</span>
                  <span className="font-space-mono text-cyber-green">{pts} pts</span>
                </div>
              ))}
            </div>
            <div className="border-t border-cyber-purple/20 pt-2 flex justify-between text-xs font-semibold">
              <span className="text-white/60">Total</span>
              <span className="font-space-mono text-cyber-green">{selectedRubric.max_score} pts</span>
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={mutation.isPending || !file}
          data-magnetic="true"
          className="cyber-btn w-full disabled:opacity-30 disabled:cursor-none"
          style={{ height: 52 }}
        >
          {mutation.isPending ? ">> TRANSMITTING..." : ">> SUBMIT FOR ANALYSIS"}
        </button>
      </form>

      {/* Recent submissions */}
      {recent.length > 0 && (
        <div className="mt-6 border-t border-white/10 pt-6">
          <h4 className="font-heading text-sm text-cyber-green mb-3">Recent Submissions</h4>
          <div className="space-y-2">
            {recent.map((sub: HistoryItem) => (
              <button
                key={sub.submission_id}
                onClick={() => router.push(`/report/${sub.submission_id}`)}
                className="w-full flex items-center justify-between p-3 border border-white/10 hover:border-cyber-green/30 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <span className={`w-2 h-2 ${LANG_COLORS[sub.language] ?? "bg-gray-400"}`} />
                  <div>
                    <p className="text-xs text-white/80">{sub.assignment_name}</p>
                    <p className="text-[10px] text-white/40 font-space-mono">
                      {sub.submission_id.slice(0, 12)}...
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  {sub.score !== null ? (
                    <span className="font-space-mono text-sm text-cyber-green">{sub.score}</span>
                  ) : (
                    <span className="text-[10px] text-white/40 uppercase">{sub.status}</span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Confirmation dialog */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="cyber-panel p-8 max-w-md w-full mx-4 space-y-5">
            <h3 className="font-heading text-lg text-cyber-green">Confirm Submission</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-white/50">File</span>
                <span className="text-white/80">{file?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/50">Size</span>
                <span className="text-white/80">{file ? (file.size / 1024).toFixed(1) : 0}KB</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/50">Assignment</span>
                <span className="text-white/80">{selectedAssignment?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/50">Student</span>
                <span className="text-white/80">{studentId}</span>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 py-3 border border-white/20 text-white/60 font-syncopate text-[10px] tracking-widest uppercase hover:border-white/40 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmSubmit}
                disabled={mutation.isPending}
                className="flex-1 cyber-btn disabled:opacity-30"
                style={{ height: 44 }}
              >
                {mutation.isPending ? ">> SENDING..." : ">> CONFIRM"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
