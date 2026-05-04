import { describe, expect, it } from "vitest"
import { createSessionToken, verifySessionToken } from "./auth"

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
})
