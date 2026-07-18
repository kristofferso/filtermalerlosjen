import { createServerFn } from "@tanstack/react-start"
import { inArray } from "drizzle-orm"
import { z } from "zod"
import {
  EMAIL_TEMPLATE_IDS,
  buildBroadcastEmail,
  buildEmailTemplatePreviews,
  buildTemplateSampleEmail,
  getNotificationDeliveryStatus,
  sendNotificationEmail,
} from "./notifications"
import { getCurrentUser, requireAdmin } from "./session"
import { db } from "@/db/client"
import { customers } from "@/db/schema"

function getNotificationBaseUrl() {
  return process.env.APP_URL?.trim() || "http://localhost:3000"
}

const sendTemplateTestSchema = z.object({
  templateId: z.enum(EMAIL_TEMPLATE_IDS),
  to: z.string().trim().email(),
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

    return {
      unlocked: true as const,
      adminEmail: user.email,
      templates: buildEmailTemplatePreviews(baseUrl),
      members: memberRows.filter((member) => member.email.trim().length > 0),
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

    const results: Array<{
      id: string
      name: string
      email: string
      status: "sent" | "skipped" | "failed"
    }> = []

    for (const recipient of deliverable) {
      const email = buildBroadcastEmail({
        to: recipient.email.trim(),
        subject: data.subject,
        body: data.body,
        customerName: recipient.name,
      })

      try {
        const result = await sendNotificationEmail(email)
        results.push({
          id: recipient.id,
          name: recipient.name,
          email: recipient.email,
          status: result.sent ? "sent" : "skipped",
        })
      } catch (error) {
        console.error("Failed to send broadcast email", error)
        results.push({
          id: recipient.id,
          name: recipient.name,
          email: recipient.email,
          status: "failed",
        })
      }
    }

    return {
      requested: data.customerIds.length,
      sentCount: results.filter((entry) => entry.status === "sent").length,
      skippedCount: results.filter((entry) => entry.status === "skipped")
        .length,
      failedCount: results.filter((entry) => entry.status === "failed").length,
      results,
    }
  })
