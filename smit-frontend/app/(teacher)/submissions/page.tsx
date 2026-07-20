"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchSubmissions,
  approveSubmission,
  type SubmissionListItem,
} from "@/lib/api";
import { CyberToggle } from "@/components/CyberToggle";

type Filter = "all" | "pending" | "approved" | "rejected";

const FILTER_OPTIONS: { label: string; value: Filter }[] = [
  { label: "All", value: "all" },
  { label: "Pending", value: "pending" },
  { label: "Approved", value: "approved" },
  { label: "Rejected", value: "rejected" },
];

const STATUS_COLORS: Record<string, string> = {
  completed: "text-cyber-green",
  pending: "text-cyber-cyan animate-pulse-neon",
  failed: "text-cyber-crimson",
};

const APPROVAL_COLORS: Record<string, string> = {
  approved: "text-cyber-green",
  rejected: "text-cyber-crimson",
  pending: "text-cyber-cyan",
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function SubmissionsPage() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<Filter>("all");
  const [batch] = useState("SYNAPSE-Batch-42");
  const [rejectionNote, setRejectionNote] = useState("");
  const [noteTarget, setNoteTarget] = useState<string | null>(null);

  useEffect(() => {
    setRejectionNote("");
  }, [noteTarget]);

  const { data: submissions = [], isLoading } = useQuery({
    queryKey: ["submissions", batch, filter],
    queryFn: () =>
      fetchSubmissions(batch, filter === "all" ? undefined : filter),
  });

  const approveMutation = useMutation({
    mutationFn: (vars: {
      id: string;
      action: "approved" | "rejected";
      note?: string;
    }) => approveSubmission(vars.id, vars.action, vars.note),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["submissions", batch] });
      setNoteTarget(null);
      setRejectionNote("");
    },
  });

  const handleApprove = (id: string) => {
    approveMutation.mutate({ id, action: "approved" });
  };

  const handleReject = (id: string) => {
    if (rejectionNote.trim()) {
      approveMutation.mutate({ id, action: "rejected", note: rejectionNote });
    } else {
      approveMutation.mutate({ id, action: "rejected" });
    }
  };

  return (
    <main className="min-h-screen bg-cyber-black pt-20 pb-12 px-[var(--space-page-x)]">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="cyber-panel p-6 lg:p-8">
          <div className="flex items-center gap-3 mb-2">
            <span className="inline-block w-2 h-2 bg-cyber-cyan animate-pulse-neon" />
            <span className="font-syncopate text-[10px] tracking-[0.3em] text-cyber-cyan/50 uppercase">
              Node // Review Queue
            </span>
          </div>
          <h1 className="font-heading font-bold uppercase tracking-[0.08em] bg-gradient-to-r from-cyber-green via-cyber-purple to-cyber-green bg-[length:200%_auto] animate-gradient-shift bg-clip-text text-transparent">
            Student Submissions
          </h1>
        </div>

        {/* Filter tabs */}
        <div className="flex items-center gap-4 flex-wrap">
          <CyberToggle
            options={[
              { value: "all", label: "All", color: "green" },
              { value: "pending", label: "Pending", color: "cyan" },
              { value: "approved", label: "Approved", color: "green" },
              { value: "rejected", label: "Rejected", color: "crimson" },
            ]}
            value={filter}
            onChange={(v) => setFilter(v as Filter)}
            size="sm"
          />
          <div className="ml-auto font-syncopate text-[10px] text-cyber-green/40">
            {submissions.length} submission{submissions.length !== 1 ? "s" : ""}
          </div>
        </div>

        {/* Table */}
        {isLoading && (
          <div className="cyber-panel p-6 text-center">
            <span className="font-syncopate text-xs tracking-widest text-cyber-green/50 animate-pulse-neon uppercase">
              &gt;&gt; Loading submissions...
            </span>
          </div>
        )}

        {!isLoading && submissions.length === 0 && (
          <div className="cyber-panel p-6 text-center">
            <span className="font-syncopate text-xs tracking-widest text-cyber-green/50 uppercase">
              // NO SUBMISSIONS FOUND
            </span>
          </div>
        )}

        {!isLoading && submissions.length > 0 && (
          <div className="space-y-3">
            {submissions.map((sub) => (
              <div
                key={sub.id}
                className="cyber-panel p-4 lg:p-6"
              >
                <div className="flex flex-col md:flex-row md:items-center gap-4">
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-orbitron text-sm font-bold text-cyber-green truncate">
                        {sub.student_name ?? sub.student_id}
                      </span>
                      <span className="font-space-mono text-[10px] text-cyber-green/30">
                        {sub.file_name}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 font-space-mono text-[10px]">
                      <span className="text-cyber-cyan uppercase">
                        {sub.language}
                      </span>
                      <span className={STATUS_COLORS[sub.status] ?? "text-cyber-green/50"}>
                        {sub.status}
                      </span>
                      <span className="text-cyber-green/30">
                        {formatDate(sub.created_at)}
                      </span>
                      {sub.score !== null && (
                        <span className="text-cyber-purple font-bold">
                          {sub.score}/100 ({sub.grade})
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Approval status badge */}
                  <div className="flex items-center gap-3">
                    <span
                      className={`font-syncopate text-[10px] tracking-widest uppercase px-3 py-1 border ${
                        sub.approval_status === "approved"
                          ? "border-cyber-green text-cyber-green"
                          : sub.approval_status === "rejected"
                          ? "border-cyber-crimson text-cyber-crimson"
                          : "border-cyber-cyan/40 text-cyber-cyan"
                      }`}
                    >
                      {sub.approval_status}
                    </span>

                    {/* Action buttons (only for pending) */}
                    {sub.approval_status === "pending" && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleApprove(sub.id)}
                          disabled={approveMutation.isPending}
                          className="cyber-btn text-[10px] px-3 py-1 h-auto bg-cyber-green/10 text-cyber-green border-cyber-green hover:bg-cyber-green/20 disabled:opacity-40"
                        >
                          &gt;&gt; Approve
                        </button>
                        <button
                          onClick={() =>
                            noteTarget === sub.id
                              ? handleReject(sub.id)
                              : setNoteTarget(sub.id)
                          }
                          disabled={approveMutation.isPending}
                          className="cyber-btn text-[10px] px-3 py-1 h-auto bg-cyber-crimson/10 text-cyber-crimson border-cyber-crimson hover:bg-cyber-crimson/20 disabled:opacity-40"
                        >
                          &gt;&gt; Reject
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Rejection note input */}
                {noteTarget === sub.id && sub.approval_status === "pending" && (
                  <div className="mt-3 flex gap-2">
                    <input
                      type="text"
                      value={rejectionNote}
                      onChange={(e) => setRejectionNote(e.target.value)}
                      placeholder="Rejection reason (optional)"
                      className="flex-1 bg-cyber-black border border-cyber-crimson/40 px-3 py-1.5 font-space-mono text-xs text-cyber-green focus:outline-none focus:border-cyber-crimson"
                    />
                    <button
                      onClick={() => handleReject(sub.id)}
                      disabled={approveMutation.isPending}
                      className="cyber-btn text-[10px] px-3 py-1 h-auto bg-cyber-crimson/20 text-cyber-crimson border-cyber-crimson"
                    >
                      Confirm Reject
                    </button>
                    <button
                      onClick={() => {
                        setNoteTarget(null);
                        setRejectionNote("");
                      }}
                      className="cyber-btn text-[10px] px-3 py-1 h-auto opacity-60"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
