// ─────────────────────────────────────────────────────────────
//  Auth module tests — verifies password validation logic.
//  Session/cookie tests happen at the API route level.
// ─────────────────────────────────────────────────────────────
import { describe, it, expect } from "vitest";
import bcrypt from "bcryptjs";

describe("Auth password validation", () => {
  it("validates correct password against bcrypt hash", async () => {
    // Simulate what happens at login: hash a password, then verify it
    const password = "test-admin-password";
    const hash = await bcrypt.hash(password, 10);

    // Correct password should match
    const valid = await bcrypt.compare(password, hash);
    expect(valid).toBe(true);

    // Wrong password should not match
    const invalid = await bcrypt.compare("wrong-password", hash);
    expect(invalid).toBe(false);
  });
});
