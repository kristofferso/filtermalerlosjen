import "@tanstack/react-start/server-only"
import { deleteCookie, getCookie, setCookie } from "@tanstack/react-start/server"
import {
  createCustomerToken,
  createSessionToken,
  requireEnv,
  verifyCustomerToken,
  verifySessionToken,
} from "@/lib/auth"

export const GATE_COOKIE = "kk_gate"
export const SESSION_COOKIE = "kk_session"

const WRONG_PASSWORD_ERROR =
  "Det er ikke det hemmelige ordet! Er du med i losjen??"

const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 60 * 60 * 24 * 180,
}

export async function unlockGate(password: string) {
  if (password !== requireEnv("CUSTOMER_PASSWORD")) {
    return { ok: false, error: WRONG_PASSWORD_ERROR } as const
  }

  setCookie(
    GATE_COOKIE,
    await createSessionToken({
      purpose: "gate",
      secret: requireEnv("SESSION_SECRET"),
    }),
    sessionCookieOptions
  )

  return { ok: true } as const
}

export async function isGateUnlocked() {
  return verifySessionToken({
    token: getCookie(GATE_COOKIE),
    purpose: "gate",
    secret: requireEnv("SESSION_SECRET"),
  })
}

export async function setAuthenticatedSession(customerId: string) {
  setCookie(
    SESSION_COOKIE,
    await createCustomerToken({
      customerId,
      secret: requireEnv("SESSION_SECRET"),
    }),
    sessionCookieOptions
  )
}

export async function getAuthenticatedCustomerId() {
  return verifyCustomerToken({
    token: getCookie(SESSION_COOKIE),
    secret: requireEnv("SESSION_SECRET"),
  })
}

export function clearAuthenticatedSession() {
  deleteCookie(SESSION_COOKIE, { path: "/" })
}
