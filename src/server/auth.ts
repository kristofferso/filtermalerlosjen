import { createServerFn } from "@tanstack/react-start"
import { z } from "zod"
import { createSessionToken, requireEnv, verifySessionToken } from "@/lib/auth"

export const CUSTOMER_COOKIE = "kk_customer_session"
export const ADMIN_COOKIE = "kk_admin_session"

const passwordSchema = z.object({ password: z.string().min(1) })

async function getCookieHelpers() {
  const importer = new Function("specifier", "return import(specifier)") as (specifier: string) => Promise<typeof import("@tanstack/start-server-core")>
  return importer("@tanstack/start-server-core")
}

export const unlockCustomer = createServerFn({ method: "POST" })
  .inputValidator((input) => passwordSchema.parse(input))
  .handler(async ({ data }) => {
    if (data.password !== requireEnv("CUSTOMER_PASSWORD")) {
      return { ok: false, error: "Wrong password" }
    }

    const { setCookie } = await getCookieHelpers()
    setCookie(CUSTOMER_COOKIE, await createSessionToken({ purpose: "customer", secret: requireEnv("SESSION_SECRET") }), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 180,
    })

    return { ok: true }
  })

export const unlockAdmin = createServerFn({ method: "POST" })
  .inputValidator((input) => passwordSchema.parse(input))
  .handler(async ({ data }) => {
    if (data.password !== requireEnv("ADMIN_PASSWORD")) {
      return { ok: false, error: "Wrong password" }
    }

    const { setCookie } = await getCookieHelpers()
    setCookie(ADMIN_COOKIE, await createSessionToken({ purpose: "admin", secret: requireEnv("SESSION_SECRET") }), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 180,
    })

    return { ok: true }
  })

export async function isCustomerUnlocked() {
  const { getCookie } = await getCookieHelpers()
  return verifySessionToken({
    token: getCookie(CUSTOMER_COOKIE),
    purpose: "customer",
    secret: requireEnv("SESSION_SECRET"),
  })
}

export async function isAdminUnlocked() {
  const { getCookie } = await getCookieHelpers()
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
