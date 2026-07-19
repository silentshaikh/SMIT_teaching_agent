"use client";

import { useState, useEffect, useRef, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import gsap from "gsap";
import { useSubmissionStore } from "@/store/submission";
import { setAuthToken } from "@/lib/api";

export default function RegisterPage() {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"student" | "teacher">("student");
  const [batch, setBatch] = useState("");
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
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, role, batch: role === "student" ? batch : undefined }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.detail || "Registration failed");
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
    <main className="min-h-screen bg-cyber-black flex items-center justify-center px-[var(--space-page-x)]">
      <div ref={containerRef} className="w-full max-w-md space-y-6">
        <div className="cyber-panel p-8">
          <div className="flex items-center gap-3 mb-2">
            <span className="inline-block w-2 h-2 bg-cyber-purple animate-pulse-neon" />
            <span className="font-syncopate text-[10px] tracking-[0.3em] text-cyber-purple/50 uppercase">
              Node // Auth
            </span>
          </div>
          <h1 className="font-heading font-bold text-2xl uppercase tracking-[0.08em] bg-gradient-to-r from-cyber-purple via-cyber-green to-cyber-purple bg-[length:200%_auto] animate-gradient-shift bg-clip-text text-transparent">
            Create Account
          </h1>
          <p className="font-syncopate text-[10px] text-cyber-purple/40 mt-2 tracking-[0.3em] uppercase">
            {"// REGISTER TO ACCESS THE SYSTEM"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="cyber-panel p-8 space-y-5">
          {error && (
            <div className="border border-cyber-crimson bg-cyber-crimson/10 p-4 flex items-center gap-3">
              <span className="text-cyber-crimson font-michroma text-sm">&gt;&gt;</span>
              <span className="font-syncopate text-[10px] tracking-widest text-cyber-crimson uppercase flex-1">
                {error}
              </span>
            </div>
          )}

          <div>
            <label className="block mb-2">Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="cyber-input"
              placeholder="> Your name"
              required
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
              placeholder="> min 6 characters"
              minLength={6}
              required
            />
          </div>

          <div>
            <label className="block mb-2">Role *</label>
            <div className="flex gap-3">
              {(["student", "teacher"] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  className={`flex-1 py-3 border font-syncopate text-[10px] tracking-widest uppercase transition-colors ${
                    role === r
                      ? "border-cyber-purple bg-cyber-purple/20 text-cyber-purple"
                      : "border-cyber-purple/20 text-cyber-purple/40 hover:border-cyber-purple/50"
                  }`}
                >
                  &gt;&gt; {r}
                </button>
              ))}
            </div>
          </div>

          {role === "student" && (
            <div>
              <label className="block mb-2">Batch *</label>
              <input
                type="text"
                value={batch}
                onChange={(e) => setBatch(e.target.value)}
                className="cyber-input"
                placeholder="> e.g. Fall 2026"
                required
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="cyber-btn w-full disabled:opacity-30 disabled:cursor-none"
            style={{ height: 52 }}
          >
            {loading ? ">> CREATING ACCOUNT..." : ">> SIGN UP"}
          </button>

          <p className="text-center font-syncopate text-[10px] text-cyber-green/40 tracking-widest">
            Already have an account?{" "}
            <a href="/login" className="text-cyber-green hover:text-cyber-green/80 underline">
              Sign In
            </a>
          </p>
        </form>
      </div>
    </main>
  );
}
