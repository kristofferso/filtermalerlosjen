const encoder = new TextEncoder()

async function hmac(message: string, secret: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  )
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(message))
  return btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "")
}

export type SessionPurpose = "admin" | "customer" | "gate"

export async function createSessionToken({ purpose, secret }: { purpose: SessionPurpose; secret: string }) {
  const payload = `${purpose}.${Date.now()}`
  const signature = await hmac(payload, secret)
  return `${payload}.${signature}`
}

export async function createCustomerToken({
  customerId,
  secret,
}: {
  customerId: string
  secret: string
}) {
  const payload = `customer-id.${customerId}`
  const signature = await hmac(payload, secret)
  return `${payload}.${signature}`
}

export async function verifySessionToken({
  token,
  purpose,
  secret,
}: {
  token: string | undefined
  purpose: SessionPurpose
  secret: string
}) {
  if (!token) return false
  const parts = token.split(".")
  if (parts.length !== 3) return false
  const [tokenPurpose, issuedAt, signature] = parts
  if (tokenPurpose !== purpose || !issuedAt || !signature) return false
  const expected = await hmac(`${tokenPurpose}.${issuedAt}`, secret)
  return expected === signature
}

export async function verifyCustomerToken({
  token,
  secret,
}: {
  token: string | undefined
  secret: string
}) {
  if (!token) return null
  const parts = token.split(".")
  if (parts.length !== 3) return null
  const [purpose, customerId, signature] = parts
  if (purpose !== "customer-id" || !customerId || !signature) return null
  const expected = await hmac(`${purpose}.${customerId}`, secret)
  return expected === signature ? customerId : null
}

export function requireEnv(name: string) {
  const value = process.env[name]
  if (!value) {
    throw new Error(`${name} is required`)
  }
  return value
}

export const LOGIN_CODE_LENGTH = 6
export const LOGIN_CODE_TTL_MS = 10 * 60 * 1000
export const LOGIN_CODE_MAX_ATTEMPTS = 5
export const LOGIN_CODE_RESEND_COOLDOWN_MS = 30 * 1000

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

export function generateLoginCode() {
  const max = 10 ** LOGIN_CODE_LENGTH
  const buffer = new Uint32Array(1)
  crypto.getRandomValues(buffer)
  const value = buffer[0] % max
  return value.toString().padStart(LOGIN_CODE_LENGTH, "0")
}

export async function hashLoginCode(code: string, secret: string) {
  return hmac(`login-code.${code}`, secret)
}

export function isLoginCodeExpired(expiresAt: Date, now: Date = new Date()) {
  return expiresAt.getTime() <= now.getTime()
}

export function isLoginCodeAttemptsExceeded(attempts: number) {
  return attempts >= LOGIN_CODE_MAX_ATTEMPTS
}
