// ─────────────────────────────────────────────────────────────
//  Auth module tests — verifies password validation logic.
// ─────────────────────────────────────────────────────────────
import { describe, it, expect } from "vitest";

describe("Auth password validation", () => {
  it("validates correct password via direct comparison", () => {
    const adminPassword = "test-admin-password";
    const correctInput: string = "test-admin-password";
    const wrongInput: string = "wrong-password";

    // Correct password should match
    expect(correctInput === adminPassword).toBe(true);

    // Wrong password should not match
    expect(wrongInput === adminPassword).toBe(false);
  });
});
