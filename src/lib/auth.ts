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

export async function createSessionToken({ purpose, secret }: { purpose: "admin" | "customer"; secret: string }) {
  const payload = `${purpose}.${Date.now()}`
  const signature = await hmac(payload, secret)
  return `${payload}.${signature}`
}

export async function verifySessionToken({
  token,
  purpose,
  secret,
}: {
  token: string | undefined
  purpose: "admin" | "customer"
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

export function requireEnv(name: string) {
  const value = process.env[name]
  if (!value) {
    throw new Error(`${name} is required`)
  }
  return value
}
