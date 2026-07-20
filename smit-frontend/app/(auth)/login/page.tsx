"use client";

import { useState, useEffect, useRef, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import gsap from "gsap";
import { useSubmissionStore } from "@/store/submission";
import { setAuthToken } from "@/lib/api";
import { CyberToggle } from "@/components/CyberToggle";

export default function LoginPage() {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"student" | "teacher">("student");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const setAuth = useSubmissionStore((s) => s.setAuth);

  useEffect(() => {
    if (!containerRef.current) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        containerRef.current,
        { y: 40, opacity: 0, scale: 0.95 },
        { y: 0, opacity: 1, scale: 1, duration: 0.5, ease: "back.out(3)" }
      );
    });
    return () => ctx.revert();
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, role }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.detail || "Login failed");
        return;
      }

      const data = await res.json();
      setAuth(data.token, data.role, data.user_id);
      setAuthToken(data.token);
      if (data.role === "teacher") {
        router.push("/dashboard");
      } else {
        router.push("/submit");
      }
    } catch {
      setError("Network error — is the backend running?");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-cyber-black flex items-center justify-center px-[var(--space-page-x)] pt-16 pb-8">
      <div ref={containerRef} className="w-full max-w-md space-y-4">
        {/* Header */}
        <div className="text-center py-6">
          <div className="flex items-center justify-center gap-3 mb-3">
            <span className="inline-block w-2 h-2 bg-cyber-green animate-pulse-neon" />
            <span className="font-syncopate text-[10px] tracking-[0.3em] text-cyber-green/50 uppercase">
              Node // Auth
            </span>
            <span className="inline-block w-2 h-2 bg-cyber-green animate-pulse-neon" />
          </div>
          <h1 className="font-heading font-bold text-3xl uppercase tracking-[0.08em] bg-gradient-to-r from-cyber-green via-cyber-purple to-cyber-green bg-[length:200%_auto] animate-gradient-shift bg-clip-text text-transparent">
            Sign In
          </h1>
          <p className="font-syncopate text-[10px] text-cyber-green/40 mt-2 tracking-[0.3em] uppercase">
            {"// ENTER CREDENTIALS TO ACCESS THE SYSTEM"}
          </p>
        </div>

        {/* Form card */}
        <form onSubmit={handleSubmit} className="cyber-panel p-8 space-y-5">
          {error && (
            <div className="border border-cyber-crimson bg-cyber-crimson/10 p-4 flex items-center gap-3">
              <span className="text-cyber-crimson font-syncopate text-sm">&gt;&gt;</span>
              <span className="font-syncopate text-[10px] tracking-widest text-cyber-crimson uppercase flex-1">
                {error}
              </span>
            </div>
          )}

          <div>
            <label className="block mb-2">I am a *</label>
            <CyberToggle
              options={[
                { value: "student", label: "Student", color: "green" },
                { value: "teacher", label: "Teacher", color: "purple" },
              ]}
              value={role}
              onChange={(v) => setRole(v as "student" | "teacher")}
              fullWidth
            />
          </div>

          <div>
            <label className="block mb-2">Email *</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="cyber-input"
              placeholder="> you@smit.edu"
              required
            />
          </div>

          <div>
            <label className="block mb-2">Password *</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="cyber-input"
              placeholder="> ********"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="cyber-btn w-full disabled:opacity-30 disabled:cursor-none"
            style={{ height: 52 }}
          >
            {loading ? ">> AUTHENTICATING..." : ">> SIGN IN"}
          </button>
          <p className="text-center font-syncopate text-[10px] text-cyber-green/40 tracking-widest">
            Don&apos;t have an account?{" "}
            <a href="/register" className="text-cyber-green hover:text-cyber-green/80 underline">
              Sign Up
            </a>
          </p>
        </form>
      </div>
    </main>
  );
}
