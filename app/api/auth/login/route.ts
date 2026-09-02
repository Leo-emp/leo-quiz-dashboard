// ─────────────────────────────────────────────────────────────
//  POST /api/auth/login
//  Validates admin email + password against env vars.
//  On success: sets encrypted session cookie, returns 200.
//  On failure: returns 401 with error message.
// ─────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { getSession } from "@/lib/auth";

// # Timing-safe string comparison — prevents timing attacks on credentials
function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  if (bufA.length !== bufB.length) return false
  return timingSafeEqual(bufA, bufB)
}

export async function POST(request: Request) {
  // Parse the login form data
  const body = await request.json().catch(() => ({}));
  const { email, password } = body as { email?: string; password?: string };

  // Validate required fields
  if (!email || !password) {
    return NextResponse.json(
      { error: "Email and password are required" },
      { status: 400 }
    );
  }

  // Check credentials against env vars
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword) {
    console.error("[AUTH] ADMIN_EMAIL or ADMIN_PASSWORD not set");
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 }
    );
  }

  // Verify email (case-insensitive) and password (timing-safe)
  if (!safeEqual(email.toLowerCase(), adminEmail.toLowerCase()) || !safeEqual(password, adminPassword)) {
    return NextResponse.json(
      { error: "Invalid credentials" },
      { status: 401 }
    );
  }

  // -- Login successful — create session --
  const session = await getSession();
  session.isLoggedIn = true;
  session.email = email;
  await session.save();

  return NextResponse.json({ success: true });
}
