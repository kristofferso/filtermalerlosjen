import "@tanstack/react-start/server-only"
import { deleteCookie, getCookie, setCookie } from "@tanstack/react-start/server"
import {
  createCustomerToken,
  createSessionToken,
  requireEnv,
  verifyCustomerToken,
  verifySessionToken,
} from "@/lib/auth"

export const CUSTOMER_COOKIE = "kk_customer_session"
export const ADMIN_COOKIE = "kk_admin_session"
export const SELECTED_CUSTOMER_COOKIE = "kk_selected_customer"

const WRONG_PASSWORD_ERROR =
  "Det er ikke det hemmelige ordet! Er du med i losjen??"

const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 60 * 60 * 24 * 180,
}

export async function unlockCustomerSession(password: string) {
  if (password !== requireEnv("CUSTOMER_PASSWORD")) {
    return { ok: false, error: WRONG_PASSWORD_ERROR } as const
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
    return { ok: false, error: WRONG_PASSWORD_ERROR } as const
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

export async function selectCustomerSession(customerId: string) {
  setCookie(
    SELECTED_CUSTOMER_COOKIE,
    await createCustomerToken({
      customerId,
      secret: requireEnv("SESSION_SECRET"),
    }),
    sessionCookieOptions
  )
}

export function clearSelectedCustomerSession() {
  deleteCookie(SELECTED_CUSTOMER_COOKIE, { path: "/" })
}

export async function getSelectedCustomerId() {
  return verifyCustomerToken({
    token: getCookie(SELECTED_CUSTOMER_COOKIE),
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
