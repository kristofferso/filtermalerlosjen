import "@tanstack/react-start/server-only"
import { getCookie, setCookie } from "@tanstack/react-start/server"
import { createSessionToken, requireEnv, verifySessionToken } from "@/lib/auth"

export const CUSTOMER_COOKIE = "kk_customer_session"
export const ADMIN_COOKIE = "kk_admin_session"

const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 60 * 60 * 24 * 180,
}

export async function unlockCustomerSession(password: string) {
  if (password !== requireEnv("CUSTOMER_PASSWORD")) {
    return { ok: false, error: "Wrong password" } as const
  }

  setCookie(
    CUSTOMER_COOKIE,
    await createSessionToken({
      purpose: "customer",
      secret: requireEnv("SESSION_SECRET"),
    }),
    sessionCookieOptions
  )

  return { ok: true } as const
}

export async function unlockAdminSession(password: string) {
  if (password !== requireEnv("ADMIN_PASSWORD")) {
    return { ok: false, error: "Wrong password" } as const
  }

  setCookie(
    ADMIN_COOKIE,
    await createSessionToken({
      purpose: "admin",
      secret: requireEnv("SESSION_SECRET"),
    }),
    sessionCookieOptions
  )

  return { ok: true } as const
}

export async function isCustomerUnlocked() {
  return verifySessionToken({
    token: getCookie(CUSTOMER_COOKIE),
    purpose: "customer",
    secret: requireEnv("SESSION_SECRET"),
  })
}

export async function isAdminUnlocked() {
  return verifySessionToken({
    token: getCookie(ADMIN_COOKIE),
    purpose: "admin",
    secret: requireEnv("SESSION_SECRET"),
  })
}

export async function assertAdmin() {
  if (!(await isAdminUnlocked())) {
    throw new Error("Admin access required")
  }
}
