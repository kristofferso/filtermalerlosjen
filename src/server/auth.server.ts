import "@tanstack/react-start/server-only"
import { deleteCookie, getCookie, setCookie } from "@tanstack/react-start/server"
import {
  createCustomerToken,
  requireEnv,
  verifyCustomerToken,
} from "@/lib/auth"

export const SESSION_COOKIE = "kk_session"

const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 60 * 60 * 24 * 180,
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
