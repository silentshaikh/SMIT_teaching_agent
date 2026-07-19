import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ detail: "Invalid JSON" }, { status: 422 });
  }

  const res = await fetch(`${BASE}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: "Login failed" }));
    return NextResponse.json(error, { status: res.status });
  }

  const data = await res.json();

  const response = NextResponse.json(data);
  response.cookies.set("smit_token", data.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24, // 24 hours
  });

  return response;
}
