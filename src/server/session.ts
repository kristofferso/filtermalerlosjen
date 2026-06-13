import "@tanstack/react-start/server-only"
import { eq } from "drizzle-orm"
import { getAuthenticatedCustomerId } from "./auth.server"
import { db } from "@/db/client"
import { customers } from "@/db/schema"
import { normalizeEmail } from "@/lib/auth"

export type CurrentUser = {
  id: string
  name: string
  email: string
  phone: string
  role: "member" | "admin"
  isAdmin: boolean
}

function getAdminEmails() {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => normalizeEmail(email))
    .filter(Boolean)
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const customerId = await getAuthenticatedCustomerId()
  if (!customerId) return null

  const rows = await db
    .select()
    .from(customers)
    .where(eq(customers.id, customerId))
    .limit(1)
  const customer = rows.at(0)
  if (!customer || !customer.isActive) return null

  const isAdmin =
    customer.role === "admin" ||
    getAdminEmails().includes(normalizeEmail(customer.email))

  return {
    id: customer.id,
    name: customer.name,
    email: customer.email,
    phone: customer.phone,
    role: isAdmin ? "admin" : "member",
    isAdmin,
  }
}

export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser()
  if (!user) throw new Error("Du må logge inn")
  return user
}

export async function requireAdmin(): Promise<CurrentUser> {
  const user = await getCurrentUser()
  if (!user?.isAdmin) throw new Error("Admin access required")
  return user
}
