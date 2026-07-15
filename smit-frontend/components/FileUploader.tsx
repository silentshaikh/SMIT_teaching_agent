"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { submitFile } from "@/lib/api";
import { useSubmissionStore } from "@/store/submission";
import type { SubmissionResponse } from "@/lib/types";

const ALLOWED_EXTENSIONS = [".js", ".py", ".html"];
const MAX_SIZE = 50 * 1024;

export function FileUploader() {
  const router = useRouter();
  const setSubmissionId = useSubmissionStore((s) => s.setSubmissionId);
  const setStatus = useSubmissionStore((s) => s.setStatus);
  const setOriginalCode = useSubmissionStore((s) => s.setOriginalCode);
  const setLanguage = useSubmissionStore((s) => s.setLanguage);

  const [file, setFile] = useState<File | null>(null);
  const [studentId, setStudentId] = useState("");
  const [assignmentName, setAssignmentName] = useState("");
  const [rubricId, setRubricId] = useState("default");
  const [error, setError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const mutation = useMutation({
    mutationFn: () =>
      submitFile(file!, studentId, assignmentName, rubricId),
  });

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0];
      setError(null);
      setIsDragOver(false);

      if (!f) return;

      const ext = "." + f.name.split(".").pop()?.toLowerCase();
      if (!ALLOWED_EXTENSIONS.includes(ext)) {
        setError(
          `! INVALID FILE TYPE [${ext}] — ALLOWED: ${ALLOWED_EXTENSIONS.join(", ")}`
        );
        return;
      }

      if (f.size > MAX_SIZE) {
        setError(
          `! FILE OVERFLOW [${(f.size / 1024).toFixed(1)}KB] — MAX: 50KB`
        );
        return;
      }

      setFile(f);
      setLanguage(f.name.endsWith(".py") ? "python" : f.name.endsWith(".html") ? "html" : "javascript");
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          setOriginalCode(reader.result);
        }
      };
      reader.readAsText(f);
    },
    [setOriginalCode, setLanguage]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const f = e.dataTransfer.files[0];
      if (!f) return;

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
      setLanguage(f.name.endsWith(".py") ? "python" : f.name.endsWith(".html") ? "html" : "javascript");
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") setOriginalCode(reader.result);
      };
      reader.readAsText(f);
    },
    [setOriginalCode, setLanguage]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!file || !studentId || !assignmentName) {
      setError("! MISSING REQUIRED FIELDS");
      return;
    }

    mutation.mutate(undefined, {
      onSuccess: (data: SubmissionResponse) => {
        setSubmissionId(data.submission_id);
        setStatus("processing");
        router.push(`/report/${data.submission_id}`);
      },
      onError: (err: Error) => {
        setError(err instanceof Error ? `! SUBMISSION FAILED: ${err.message}` : "! UNKNOWN ERROR");
      },
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="border border-cyber-crimson bg-cyber-crimson/10 p-4 flex items-center gap-3">
          <span className="text-cyber-crimson font-michroma text-sm">&gt;&gt;</span>
          <span className="font-syncopate text-[10px] tracking-widest text-cyber-crimson uppercase flex-1">
            {error}
          </span>
        </div>
      )}

      <div>
        <label className="block mb-2">Code File *</label>
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          data-cursor="drag"
          className={`relative border-2 border-dashed transition-all duration-200 cursor-pointer hover:border-[var(--color-accent)] hover:scale-[1.01] ${
            isDragOver
              ? "border-[var(--color-accent)] bg-[var(--color-card-bg)] border-solid"
              : "border-[var(--color-card-border)]"
          }`}
          style={{ height: "clamp(160px, 20vw, 240px)" }}
        >
          <input
            type="file"
            accept=".js,.py,.html"
            onChange={handleFileChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          <div className="flex flex-col items-center justify-center h-full gap-3 p-4 text-center">
            <svg className="w-8 h-8 md:w-10 md:h-10 lg:w-12 lg:h-12 text-[var(--color-accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
            </svg>
            <p className="font-body text-sm md:text-base text-[var(--color-text-secondary)]">
              {file ? file.name : "Drag & drop or click to upload"}
            </p>
            {file && (
              <p className="font-body text-sm text-[var(--color-text-secondary)]">
                {(file.size / 1024).toFixed(1)}KB
              </p>
            )}
          </div>
        </div>
      </div>

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

      <div>
        <label className="block mb-2">Assignment Name *</label>
        <input
          type="text"
          value={assignmentName}
          onChange={(e) => setAssignmentName(e.target.value)}
          className="cyber-input"
          placeholder="> CALCULATOR_APP"
          required
        />
      </div>

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
  );
}
