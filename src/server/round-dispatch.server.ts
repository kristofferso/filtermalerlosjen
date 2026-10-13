import "@tanstack/react-start/server-only"
import { eq } from "drizzle-orm"
import {
  buildLogoUrl,
  buildNotificationEmail,
  buildOrderPageUrl,
  buildOrderUrl,
  buildRoundOpenedEmail,
} from "./notifications"
import { getOrderSummaries } from "./round-data.server"
import type { NotificationEmail } from "./notifications"
import type { RoundDispatchKind } from "@/lib/round-dispatch"
import { db } from "@/db/client"
import { customers, rounds, suppliers } from "@/db/schema"
import { calculateRoundTotals } from "@/lib/order-totals"

export type RoundDispatchEmail = NotificationEmail & {
  // Order id for order emails, customer id for member announcements.
  key: string
  recipientName: string
}

export type RoundOpenedContent = {
  subject?: string | null
  body?: string | null
}

export function getNotificationBaseUrl() {
  return process.env.APP_URL?.trim() || "http://localhost:3000"
}

// Builds the emails a round sends at a given step, from the round's current
// data. Used both for the real sends and for replaying them from the admin
// email page, so a replay is exactly what members would get.
export async function buildRoundDispatchEmails({
  kind,
  roundId,
  content = {},
}: {
  kind: RoundDispatchKind
  roundId: string
  content?: RoundOpenedContent
}): Promise<Array<RoundDispatchEmail>> {
  const roundRows = await db
    .select({ round: rounds, supplierName: suppliers.name })
    .from(rounds)
    .innerJoin(suppliers, eq(suppliers.id, rounds.supplierId))
    .where(eq(rounds.id, roundId))
    .limit(1)
  const row = roundRows.at(0)
  if (!row) throw new Error("Round not found")

  const baseUrl = getNotificationBaseUrl()

  if (kind === "round-opened") {
    const members = await db
      .select({
        id: customers.id,
        name: customers.name,
        email: customers.email,
      })
      .from(customers)
      .where(eq(customers.isActive, true))
      .orderBy(customers.name)
    const orderPageUrl = buildOrderPageUrl(baseUrl)
    const logoUrl = buildLogoUrl(baseUrl)

    return members
      .filter((member) => member.email.trim().length > 0)
      .map((member) => ({
        ...buildRoundOpenedEmail({
          to: member.email.trim(),
          customerName: member.name,
          orderPageUrl,
          logoUrl,
          supplierName: row.supplierName,
          closesAt: row.round.closesAt,
          subject: content.subject,
          body: content.body,
        }),
        key: member.id,
        recipientName: member.name,
      }))
  }

  const orderSummaries = await getOrderSummaries([roundId])
  const totals = calculateRoundTotals({
    shippingKr: row.round.shippingKr,
    orders: orderSummaries,
  })
  const emailsByOrderId = new Map(
    orderSummaries.map((order) => [order.id, order.customerEmail?.trim()])
  )

  return totals.flatMap((total) => {
    const to = emailsByOrderId.get(total.orderId)
    if (!to) return []

    const base = {
      to,
      customerName: total.customerName,
      orderUrl: buildOrderUrl(total.orderId, baseUrl),
    }
    const email =
      kind === "order-confirmed"
        ? buildNotificationEmail({ ...base, kind })
        : kind === "payment-ready"
          ? buildNotificationEmail({ ...base, kind, totalKr: total.totalKr })
          : buildNotificationEmail({
              ...base,
              kind,
              paid: total.paid,
              collected: total.collected,
            })

    return [{ ...email, key: total.orderId, recipientName: total.customerName }]
  })
}
