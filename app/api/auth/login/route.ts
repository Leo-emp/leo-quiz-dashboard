// ─────────────────────────────────────────────────────────────
//  POST /api/auth/login
//  Validates admin email + password against env vars.
//  On success: sets encrypted session cookie, returns 200.
//  On failure: returns 401 with error message.
// ─────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getSession } from "@/lib/auth";

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

  // Check email matches the admin email from env
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH;

  if (!adminEmail || !adminPasswordHash) {
    // Server misconfigured — admin credentials not set
    console.error("[AUTH] ADMIN_EMAIL or ADMIN_PASSWORD_HASH not set");
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 }
    );
  }

  // Verify email matches (case-insensitive)
  if (email.toLowerCase() !== adminEmail.toLowerCase()) {
    return NextResponse.json(
      { error: "Invalid credentials" },
      { status: 401 }
    );
  }

  // Verify password against bcrypt hash
  const passwordValid = await bcrypt.compare(password, adminPasswordHash);
  if (!passwordValid) {
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
