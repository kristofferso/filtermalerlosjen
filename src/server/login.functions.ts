import { createServerFn } from "@tanstack/react-start"
import { and, desc, eq, isNull } from "drizzle-orm"
import { z } from "zod"
import {
  clearAuthenticatedSession,
  getAuthenticatedCustomerId,
  isGateUnlocked,
  setAuthenticatedSession,
  unlockGate,
} from "./auth.server"
import { buildLoginCodeEmail, sendNotificationEmail } from "./notifications"
import { db } from "@/db/client"
import { customers, loginCodes } from "@/db/schema"
import {
  LOGIN_CODE_RESEND_COOLDOWN_MS,
  LOGIN_CODE_TTL_MS,
  generateLoginCode,
  hashLoginCode,
  isLoginCodeAttemptsExceeded,
  isLoginCodeExpired,
  normalizeEmail,
  requireEnv,
} from "@/lib/auth"
import { EIGHT_DIGIT_PHONE_PATTERN } from "@/lib/customer-phone"

const passwordSchema = z.object({ password: z.string().min(1) })
const emailSchema = z.object({ email: z.string().trim().email().max(120) })
const verifySchema = z.object({
  email: z.string().trim().email().max(120),
  code: z.string().trim().regex(/^\d{6}$/, "Koden må være 6 siffer"),
})
const signupSchema = z.object({
  name: z.string().trim().min(1).max(80),
  email: z.string().trim().email().max(120),
  phone: z
    .string()
    .trim()
    .regex(EIGHT_DIGIT_PHONE_PATTERN, "Telefonnummer må være 8 siffer")
    .optional()
    .or(z.literal("")),
})

const GATE_REQUIRED_ERROR = "Du må oppgi det hemmelige ordet først"

async function findActiveCustomerByEmail(email: string) {
  const rows = await db
    .select()
    .from(customers)
    .where(and(eq(customers.email, email), eq(customers.isActive, true)))
    .limit(1)
  return rows.at(0) ?? null
}

async function issueLoginCode(email: string, customerName: string) {
  const recent = await db
    .select()
    .from(loginCodes)
    .where(and(eq(loginCodes.email, email), isNull(loginCodes.consumedAt)))
    .orderBy(desc(loginCodes.createdAt))
    .limit(1)
  const lastCode = recent.at(0)
  if (
    lastCode &&
    Date.now() - lastCode.createdAt.getTime() < LOGIN_CODE_RESEND_COOLDOWN_MS
  ) {
    return { ok: false, error: "Vent litt før du ber om en ny kode" } as const
  }

  const code = generateLoginCode()
  const secret = requireEnv("SESSION_SECRET")
  await db.insert(loginCodes).values({
    email,
    codeHash: await hashLoginCode(code, secret),
    expiresAt: new Date(Date.now() + LOGIN_CODE_TTL_MS),
  })

  const result = await sendNotificationEmail(
    buildLoginCodeEmail({ to: email, code, customerName })
  )
  if (result.skipped) {
    console.log(`[login] Code for ${email}: ${code}`)
  }

  return { ok: true } as const
}

export const getLoginStatus = createServerFn({ method: "GET" }).handler(
  async () => {
    const [gateUnlocked, customerId] = await Promise.all([
      isGateUnlocked(),
      getAuthenticatedCustomerId(),
    ])
    return { gateUnlocked, authenticated: Boolean(customerId) }
  }
)

export const unlockGateFn = createServerFn({ method: "POST" })
  .inputValidator((input) => passwordSchema.parse(input))
  .handler(async ({ data }) => unlockGate(data.password))

export const requestLoginCode = createServerFn({ method: "POST" })
  .inputValidator((input) => emailSchema.parse(input))
  .handler(async ({ data }) => {
    if (!(await isGateUnlocked()))
      return { ok: false as const, error: GATE_REQUIRED_ERROR }

    const email = normalizeEmail(data.email)
    const customer = await findActiveCustomerByEmail(email)
    if (!customer) return { ok: false as const, notFound: true as const }

    return issueLoginCode(email, customer.name)
  })

export const verifyLoginCode = createServerFn({ method: "POST" })
  .inputValidator((input) => verifySchema.parse(input))
  .handler(async ({ data }) => {
    if (!(await isGateUnlocked()))
      return { ok: false as const, error: GATE_REQUIRED_ERROR }

    const email = normalizeEmail(data.email)
    const rows = await db
      .select()
      .from(loginCodes)
      .where(and(eq(loginCodes.email, email), isNull(loginCodes.consumedAt)))
      .orderBy(desc(loginCodes.createdAt))
      .limit(1)
    const record = rows.at(0)
    if (!record || isLoginCodeExpired(record.expiresAt)) {
      return { ok: false as const, error: "Koden er utløpt. Be om en ny." }
    }
    if (isLoginCodeAttemptsExceeded(record.attempts)) {
      return {
        ok: false as const,
        error: "For mange forsøk. Be om en ny kode.",
      }
    }

    const expected = await hashLoginCode(data.code, requireEnv("SESSION_SECRET"))
    if (expected !== record.codeHash) {
      await db
        .update(loginCodes)
        .set({ attempts: record.attempts + 1 })
        .where(eq(loginCodes.id, record.id))
      return { ok: false as const, error: "Feil kode" }
    }

    const customer = await findActiveCustomerByEmail(email)
    if (!customer) return { ok: false as const, error: "Fant ingen konto" }

    await db
      .update(loginCodes)
      .set({ consumedAt: new Date() })
      .where(eq(loginCodes.id, record.id))
    await setAuthenticatedSession(customer.id)

    return { ok: true as const }
  })

export const signup = createServerFn({ method: "POST" })
  .inputValidator((input) => signupSchema.parse(input))
  .handler(async ({ data }) => {
    if (!(await isGateUnlocked()))
      return { ok: false as const, error: GATE_REQUIRED_ERROR }

    const email = normalizeEmail(data.email)
    const existing = await findActiveCustomerByEmail(email)
    if (existing) {
      return {
        ok: false as const,
        error: "Denne e-posten er allerede registrert. Logg inn i stedet.",
      }
    }

    await db.insert(customers).values({
      name: data.name,
      email,
      phone: data.phone ?? "",
    })

    return issueLoginCode(email, data.name)
  })

export const logout = createServerFn({ method: "POST" }).handler(async () => {
  await clearAuthenticatedSession()
  return { ok: true }
})
