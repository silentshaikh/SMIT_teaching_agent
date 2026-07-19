"use client";

import { useState, useCallback, type ChangeEvent, type DragEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { bulkSubmit } from "@/lib/api";
import type { BulkSubmitResult } from "@/lib/types";

export function BulkUploader() {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const mutation = useMutation({
    mutationFn: () => bulkSubmit(file!),
  });

  const handleFileChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    setError(null);
    setIsDragOver(false);
    if (!f) return;
    if (!f.name.endsWith(".zip")) {
      setError("! INVALID FILE TYPE — must be a .zip");
      return;
    }
    setFile(f);
  }, []);

  const handleDrop = useCallback((e: DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const f = e.dataTransfer.files[0];
    if (!f) return;
    if (!f.name.endsWith(".zip")) {
      setError("! INVALID FILE TYPE — must be a .zip");
      return;
    }
    setFile(f);
  }, []);

  const handleSubmit = () => {
    if (!file) return;
    setError(null);
    mutation.mutate();
  };

  const result: BulkSubmitResult | undefined = mutation.data;

  return (
    <div className="space-y-4">
      {error && (
        <div className="border border-cyber-crimson bg-cyber-crimson/10 p-4 flex items-center gap-3">
          <span className="text-cyber-crimson font-michroma text-sm">&gt;&gt;</span>
          <span className="font-syncopate text-[10px] tracking-widest text-cyber-crimson uppercase flex-1">
            {error}
          </span>
        </div>
      )}

      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed transition-all duration-200 cursor-pointer hover:border-cyber-purple hover:scale-[1.01] ${
          isDragOver
            ? "border-cyber-purple bg-cyber-purple/5 border-solid"
            : "border-cyber-green/20"
        }`}
        style={{ height: 160 }}
      >
        <input
          type="file"
          accept=".zip"
          onChange={handleFileChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        <div className="flex flex-col items-center justify-center h-full gap-2 p-4 text-center">
          <svg className="w-8 h-8 text-cyber-purple" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0l-3-3m3 3l3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
          </svg>
          <p className="font-body text-sm text-cyber-green/60">
            {file ? file.name : "Drop a .zip of student submissions"}
          </p>
        </div>
      </div>

      <button
        onClick={handleSubmit}
        disabled={!file || mutation.isPending}
        className="cyber-btn w-full disabled:opacity-30 disabled:cursor-none"
        style={{ height: 48 }}
      >
        {mutation.isPending ? ">> Processing..." : `>> Bulk Submit (${file ? "1 file" : "no file"})`}
      </button>

      {result && (
        <div className="border border-cyber-green/20 p-4 space-y-2">
          <div className="flex items-center gap-4 font-michroma text-[10px] tracking-widest uppercase">
            <span className="text-cyber-green">Total: {result.total}</span>
            <span className="text-cyber-green">Submitted: {result.submitted}</span>
            <span className="text-cyber-crimson">Failed: {result.failed}</span>
          </div>
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {result.results.map((r, i) => (
              <div key={i} className="flex items-center gap-2 font-space-mono text-[10px]">
                <span className={r.status === "submitted" ? "text-cyber-green" : r.status === "skipped" ? "text-cyber-purple" : "text-cyber-crimson"}>
                  [{r.status.toUpperCase()}]
                </span>
                <span className="text-cyber-green/60">{r.file}</span>
                {r.reason && <span className="text-cyber-green/30">— {r.reason}</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
