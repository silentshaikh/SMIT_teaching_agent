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

  const [file, setFile] = useState<File | null>(null);
  const [studentId, setStudentId] = useState("");
  const [assignmentName, setAssignmentName] = useState("");
  const [rubricId, setRubricId] = useState("default");
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () =>
      submitFile(file!, studentId, assignmentName, rubricId),
  });

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0];
      setError(null);

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
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          setOriginalCode(reader.result);
        }
      };
      reader.readAsText(f);
    },
    [setOriginalCode]
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
        <label className="block font-syncopate text-[10px] tracking-[0.3em] text-cyber-green/70 mb-2 uppercase">
          Code File *
        </label>
        <input
          type="file"
          accept=".js,.py,.html"
          onChange={handleFileChange}
          className="cyber-input file:mr-4 file:py-2 file:px-4 file:border file:border-cyber-green file:bg-transparent file:text-cyber-green file:font-michroma file:text-[10px] file:uppercase file:tracking-widest hover:file:bg-cyber-green/10"
        />
        {file && (
          <p className="font-space-mono text-[11px] text-cyber-green/50 mt-1 tracking-wider">
            {file.name} [{(file.size / 1024).toFixed(1)}KB]
          </p>
        )}
      </div>

      <div>
        <label className="block font-orbitron text-[10px] tracking-[0.25em] text-cyber-green/70 mb-2 uppercase">
          Student ID *
        </label>
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
        <label className="block font-syncopate text-[10px] tracking-[0.3em] text-cyber-green/70 mb-2 uppercase">
          Assignment Name *
        </label>
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
        className="cyber-btn w-full disabled:opacity-30 disabled:cursor-none text-sm"
      >
        {mutation.isPending ? ">> TRANSMITTING..." : ">> SUBMIT FOR ANALYSIS"}
      </button>
    </form>
  );
}
