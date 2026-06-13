import { describe, expect, it } from "vitest"
import {
  LOGIN_CODE_MAX_ATTEMPTS,
  createSessionToken,
  generateLoginCode,
  hashLoginCode,
  isLoginCodeAttemptsExceeded,
  isLoginCodeExpired,
  normalizeEmail,
  verifySessionToken,
} from "./auth"

describe("session tokens", () => {
  it("verifies a token created with the same secret and purpose", async () => {
    const token = await createSessionToken({ purpose: "admin", secret: "secret" })
    await expect(verifySessionToken({ token, purpose: "admin", secret: "secret" })).resolves.toBe(true)
  })

  it("rejects the wrong purpose", async () => {
    const token = await createSessionToken({ purpose: "customer", secret: "secret" })
    await expect(verifySessionToken({ token, purpose: "admin", secret: "secret" })).resolves.toBe(false)
  })

  it("rejects a tampered token", async () => {
    const token = await createSessionToken({ purpose: "admin", secret: "secret" })
    await expect(verifySessionToken({ token: `${token}x`, purpose: "admin", secret: "secret" })).resolves.toBe(false)
  })

  it("supports the gate purpose", async () => {
    const token = await createSessionToken({ purpose: "gate", secret: "secret" })
    await expect(verifySessionToken({ token, purpose: "gate", secret: "secret" })).resolves.toBe(true)
  })
})

describe("login codes", () => {
  it("generates a 6-digit numeric code", () => {
    for (let i = 0; i < 50; i++) {
      expect(generateLoginCode()).toMatch(/^\d{6}$/)
    }
  })

  it("hashes deterministically and differs by code and secret", async () => {
    const a = await hashLoginCode("123456", "secret")
    const b = await hashLoginCode("123456", "secret")
    const c = await hashLoginCode("654321", "secret")
    const d = await hashLoginCode("123456", "other")
    expect(a).toBe(b)
    expect(a).not.toBe(c)
    expect(a).not.toBe(d)
  })

  it("normalizes emails", () => {
    expect(normalizeEmail("  Foo@Example.COM ")).toBe("foo@example.com")
  })

  it("detects expiry", () => {
    const now = new Date("2026-06-12T12:00:00Z")
    expect(isLoginCodeExpired(new Date("2026-06-12T11:59:00Z"), now)).toBe(true)
    expect(isLoginCodeExpired(new Date("2026-06-12T12:01:00Z"), now)).toBe(false)
  })

  it("detects attempt cap", () => {
    expect(isLoginCodeAttemptsExceeded(LOGIN_CODE_MAX_ATTEMPTS - 1)).toBe(false)
    expect(isLoginCodeAttemptsExceeded(LOGIN_CODE_MAX_ATTEMPTS)).toBe(true)
  })
})
