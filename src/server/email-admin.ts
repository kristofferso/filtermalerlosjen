import { createServerFn } from "@tanstack/react-start"
import { count, desc, eq, inArray, ne } from "drizzle-orm"
import { z } from "zod"
import {
  EMAIL_TEMPLATE_IDS,
  buildBroadcastEmail,
  buildEmailTemplatePreviews,
  buildTemplateSampleEmail,
  getNotificationDeliveryStatus,
  redirectNotificationEmail,
  sendNotificationEmail,
} from "./notifications"
import {
  buildRoundDispatchEmails,
  getNotificationBaseUrl,
} from "./round-dispatch.server"
import { getCurrentUser, requireAdmin } from "./session"
import type { NotificationEmail } from "./notifications"
import { db } from "@/db/client"
import { customers, orders, rounds, suppliers } from "@/db/schema"
import {
  ROUND_DISPATCH_KINDS,
  isRoundDispatchAvailable,
} from "@/lib/round-dispatch"

const sendTemplateTestSchema = z.object({
  templateId: z.enum(EMAIL_TEMPLATE_IDS),
  to: z.string().trim().email(),
})

const roundDispatchSchema = z.object({
  roundId: z.string().uuid(),
  kind: z.enum(ROUND_DISPATCH_KINDS),
  subject: z.string().trim().max(200).nullable().optional(),
  body: z.string().max(10_000).nullable().optional(),
})

const sendRoundDispatchSchema = roundDispatchSchema.extend({
  recipientKeys: z.array(z.string().uuid()).min(1).max(1000),
  // Set to send every selected email to this address instead of the member.
  testTo: z.string().trim().email().nullable(),
})

const sendBroadcastSchema = z.object({
  subject: z.string().trim().min(1).max(200),
  body: z.string().trim().min(1).max(10000),
  customerIds: z.array(z.string().uuid()).min(1).max(1000),
})

export const getEmailAdminData = createServerFn({ method: "GET" }).handler(
  async () => {
    const user = await getCurrentUser()
    if (!user?.isAdmin) return { unlocked: false as const }

    const baseUrl = getNotificationBaseUrl()
    const memberRows = await db
      .select({
        id: customers.id,
        name: customers.name,
        email: customers.email,
        role: customers.role,
        isActive: customers.isActive,
      })
      .from(customers)
      .orderBy(customers.name)
    const roundRows = await db
      .select({
        id: rounds.id,
        status: rounds.status,
        supplierName: suppliers.name,
        openedAt: rounds.openedAt,
        closedAt: rounds.closedAt,
        orderCount: count(orders.id),
      })
      .from(rounds)
      .innerJoin(suppliers, eq(suppliers.id, rounds.supplierId))
      .leftJoin(orders, eq(orders.roundId, rounds.id))
      .where(ne(rounds.status, "draft"))
      .groupBy(rounds.id, suppliers.name)
      .orderBy(desc(rounds.openedAt))

    return {
      unlocked: true as const,
      adminEmail: user.email,
      baseUrl,
      templates: buildEmailTemplatePreviews(baseUrl),
      members: memberRows,
      rounds: roundRows,
      delivery: getNotificationDeliveryStatus(),
    }
  }
)

export const sendTemplateTestEmail = createServerFn({ method: "POST" })
  .inputValidator((input) => sendTemplateTestSchema.parse(input))
  .handler(async ({ data }) => {
    await requireAdmin()

    const email = buildTemplateSampleEmail(data.templateId, {
      to: data.to,
      baseUrl: getNotificationBaseUrl(),
    })
    const result = await sendNotificationEmail(email)

    return { to: data.to, sent: result.sent, skipped: result.skipped }
  })

export const sendBroadcastEmail = createServerFn({ method: "POST" })
  .inputValidator((input) => sendBroadcastSchema.parse(input))
  .handler(async ({ data }) => {
    await requireAdmin()

    const recipients = await db
      .select({
        id: customers.id,
        name: customers.name,
        email: customers.email,
      })
      .from(customers)
      .where(inArray(customers.id, data.customerIds))

    const deliverable = recipients.filter(
      (recipient) => recipient.email.trim().length > 0
    )

    return sendEmailBatch(
      deliverable.map((recipient) => ({
        id: recipient.id,
        name: recipient.name,
        email: buildBroadcastEmail({
          to: recipient.email.trim(),
          subject: data.subject,
          body: data.body,
          customerName: recipient.name,
        }),
      }))
    )
  })

async function buildAdminRoundDispatch(
  data: z.infer<typeof roundDispatchSchema>
) {
  const roundRows = await db
    .select({ status: rounds.status })
    .from(rounds)
    .where(eq(rounds.id, data.roundId))
    .limit(1)
  const round = roundRows.at(0)
  if (!round) throw new Error("Runden finnes ikke")
  if (!isRoundDispatchAvailable(data.kind, round.status))
    throw new Error("Runden har ikke kommet til dette steget ennå")

  return buildRoundDispatchEmails({
    kind: data.kind,
    roundId: data.roundId,
    content: { subject: data.subject, body: data.body },
  })
}

export const previewRoundDispatch = createServerFn({ method: "POST" })
  .inputValidator((input) => roundDispatchSchema.parse(input))
  .handler(async ({ data }) => {
    await requireAdmin()

    const emails = await buildAdminRoundDispatch(data)
    const first = emails.at(0)

    return {
      recipients: emails.map((email) => ({
        key: email.key,
        name: email.recipientName,
        email: email.to,
      })),
      preview: first
        ? { subject: first.subject, html: first.html, to: first.to }
        : null,
    }
  })

export const sendRoundDispatch = createServerFn({ method: "POST" })
  .inputValidator((input) => sendRoundDispatchSchema.parse(input))
  .handler(async ({ data }) => {
    await requireAdmin()

    const selectedKeys = new Set(data.recipientKeys)
    const emails = (await buildAdminRoundDispatch(data)).filter((email) =>
      selectedKeys.has(email.key)
    )

    return sendEmailBatch(
      emails.map((email) => ({
        id: email.key,
        name: email.recipientName,
        email: data.testTo
          ? redirectNotificationEmail(email, data.testTo)
          : email,
      }))
    )
  })

async function sendEmailBatch(
  entries: Array<{ id: string; name: string; email: NotificationEmail }>
) {
  const results: Array<{
    id: string
    name: string
    email: string
    status: "sent" | "skipped" | "failed"
  }> = []

  for (const entry of entries) {
    try {
      const result = await sendNotificationEmail(entry.email)
      results.push({
        id: entry.id,
        name: entry.name,
        email: entry.email.to,
        status: result.sent ? "sent" : "skipped",
      })
    } catch (error) {
      console.error("Failed to send email", error)
      results.push({
        id: entry.id,
        name: entry.name,
        email: entry.email.to,
        status: "failed",
      })
    }
  }

  return {
    requested: entries.length,
    sentCount: results.filter((entry) => entry.status === "sent").length,
    skippedCount: results.filter((entry) => entry.status === "skipped").length,
    failedCount: results.filter((entry) => entry.status === "failed").length,
    results,
  }
}
