import "@tanstack/react-start/server-only"
import { desc, eq, inArray } from "drizzle-orm"
import { db } from "@/db/client"
import { orderItems, orders, roundCoffees } from "@/db/schema"

export async function getOrderSummaries(roundIds: Array<string>) {
  if (roundIds.length === 0) return []

  const rows = await db
    .select({
      order: orders,
      item: orderItems,
      roundCoffee: roundCoffees,
    })
    .from(orders)
    .leftJoin(orderItems, eq(orderItems.orderId, orders.id))
    .leftJoin(roundCoffees, eq(roundCoffees.id, orderItems.roundCoffeeId))
    .where(inArray(orders.roundId, roundIds))
    .orderBy(desc(orders.createdAt))

  const byOrder = new Map<
    string,
    {
      id: string
      roundId: string
      customerId: string | null
      customerName: string
      customerPhone: string | null
      customerEmail: string | null
      paid: boolean
      collected: boolean
      pickupSlotId: string
      pickupSlotLabel: string
      pickupStartsAt: Date | null
      pickupEndsAt: Date | null
      createdAt: Date
      items: Array<{
        name: string
        imageUrl: string
        quantity: number
        priceKr: number
      }>
    }
  >()

  for (const row of rows) {
    let orderSummary = byOrder.get(row.order.id)
    if (!orderSummary) {
      orderSummary = {
        id: row.order.id,
        roundId: row.order.roundId,
        customerId: row.order.customerId,
        customerName: row.order.customerName,
        customerPhone: row.order.customerPhone,
        customerEmail: row.order.customerEmail,
        paid: row.order.paid,
        collected: row.order.collected,
        pickupSlotId: row.order.pickupSlotId,
        pickupSlotLabel: row.order.pickupSlotLabel,
        pickupStartsAt: row.order.pickupStartsAt,
        pickupEndsAt: row.order.pickupEndsAt,
        createdAt: row.order.createdAt,
        items: [],
      }
      byOrder.set(row.order.id, orderSummary)
    }

    if (row.item && row.roundCoffee) {
      orderSummary.items.push({
        name: row.roundCoffee.nameSnapshot,
        imageUrl: row.roundCoffee.imageUrlSnapshot,
        quantity: row.item.quantity,
        priceKr: row.item.priceKrSnapshot,
      })
    }
  }

  return Array.from(byOrder.values())
}
