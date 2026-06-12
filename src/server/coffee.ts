import { createServerFn } from "@tanstack/react-start"
import { and, desc, eq, inArray } from "drizzle-orm"
import { z } from "zod"
import { getAuthenticatedCustomerId } from "./auth.server"
import { getCurrentUser, requireAdmin } from "./session"
import {
  buildNotificationEmail,
  buildOrderUrl,
  buildRoundNotificationEmails,
  sendNotificationEmail,
} from "./notifications"
import { db } from "@/db/client"
import { calculateRoundTotals } from "@/lib/order-totals"
import { buildVippsPaymentUrl, createVippsMessage } from "@/lib/payment-link"
import { fetchPickupSlotsFromIcsCalendar } from "@/lib/pickup-slots"
import {
  coffees,
  customers,
  orderItems,
  orders,
  roundCoffees,
  rounds,
  suppliers,
} from "@/db/schema"

const uuidSchema = z.string().uuid()
const imageUrlSchema = z
  .string()
  .trim()
  .url()
  .or(z.literal(""))
  .optional()
  .default("")

const addCoffeeSchema = z.object({
  supplierId: uuidSchema,
  name: z.string().trim().min(1),
  description: z.string().trim().optional().default(""),
  imageUrl: imageUrlSchema,
  priceKr: z.number().int().min(1),
})
const updateCoffeeSchema = addCoffeeSchema.extend({
  id: uuidSchema,
  isActive: z.boolean(),
})
const openRoundSchema = z.object({
  supplierId: uuidSchema,
  coffeeIds: z.array(uuidSchema).min(1),
  closesAt: z.string().datetime().nullable().optional(),
})
const closeRoundSchema = z.object({
  roundId: uuidSchema,
  shippingKr: z.number().int().min(0).optional().default(0),
})
const updateRoundShippingSchema = z.object({
  roundId: uuidSchema,
  shippingKr: z.number().int().min(0),
})
const markRoundReadySchema = z.object({ roundId: uuidSchema })
const updateRoundDetailsSchema = z.object({
  roundId: uuidSchema,
  closesAt: z.string().datetime().nullable().optional(),
  shippingKr: z.number().int().min(0).optional(),
  pickupInstructions: z.string().max(4000).optional().default(""),
})
const setCustomerRoleSchema = z.object({
  customerId: uuidSchema,
  role: z.enum(["member", "admin"]),
})
const setCustomerActiveSchema = z.object({
  customerId: uuidSchema,
  isActive: z.boolean(),
})
const submitOrderSchema = z.object({
  roundId: uuidSchema,
  items: z.array(
    z.object({
      roundCoffeeId: uuidSchema,
      quantity: z.number().int().min(0).max(50),
    })
  ),
})
const adminRoundDetailSchema = z.object({ roundId: uuidSchema })
const archiveCoffeeSchema = z.object({ id: uuidSchema })
const deleteOrderSchema = z.object({ orderId: uuidSchema })
const updateOrderFlagsSchema = z.object({
  orderId: uuidSchema,
  paid: z.boolean(),
  collected: z.boolean(),
})
const updateOrderPickupSlotSchema = z.object({
  orderId: uuidSchema,
  pickupSlotId: z.string().trim(),
})

async function getOpenRoundRecord() {
  const openRoundRows = await db
    .select()
    .from(rounds)
    .where(eq(rounds.status, "open"))
    .limit(1)
  return openRoundRows.at(0) ?? null
}

async function getConfiguredPickupSlots() {
  const debug = process.env.PICKUP_DEBUG === "true"
  const calendarUrl = process.env.PICKUP_CALENDAR_ICS_URL
  if (!calendarUrl) {
    if (debug) console.info("[pickup-slots] config:missing-url")
    return []
  }

  return fetchPickupSlotsFromIcsCalendar({
    url: calendarUrl,
    keyword: process.env.PICKUP_EVENT_KEYWORD ?? "Henting",
    maxDaysAhead: Number(process.env.PICKUP_MAX_DAYS_AHEAD ?? 14),
    debug,
  })
}

function groupBy<T, TKey>(items: Array<T>, getKey: (item: T) => TKey) {
  const grouped = new Map<TKey, Array<T>>()
  for (const item of items) {
    const key = getKey(item)
    grouped.set(key, [...(grouped.get(key) ?? []), item])
  }
  return grouped
}

async function getActiveCustomers() {
  return db
    .select()
    .from(customers)
    .where(eq(customers.isActive, true))
    .orderBy(customers.name)
}

async function getSelectedCustomer() {
  const customerId = await getAuthenticatedCustomerId()
  if (!customerId) return null

  const customerRows = await db
    .select()
    .from(customers)
    .where(and(eq(customers.id, customerId), eq(customers.isActive, true)))
    .limit(1)
  return customerRows.at(0) ?? null
}

async function getOrderSummaries(roundIds: Array<string>) {
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

function getNotificationBaseUrl() {
  return process.env.APP_URL?.trim() || "http://localhost:3000"
}

async function sendCustomerNotification(
  email: ReturnType<typeof buildNotificationEmail>
) {
  try {
    await sendNotificationEmail(email)
  } catch (error) {
    console.error("Failed to send notification email", error)
  }
}

async function notifyRoundCustomers(
  kind: "payment-ready" | "pickup-ready",
  roundId: string,
  shippingKr: number
) {
  const orderSummaries = await getOrderSummaries([roundId])
  const totals = calculateRoundTotals({ shippingKr, orders: orderSummaries })
  const orderSummariesById = new Map(
    orderSummaries.map((order) => [order.id, order])
  )
  const emails = buildRoundNotificationEmails({
    kind,
    baseUrl: getNotificationBaseUrl(),
    orders: totals.map((total) => ({
      ...total,
      customerEmail:
        orderSummariesById.get(total.orderId)?.customerEmail?.trim() || null,
    })),
  })

  await Promise.all(emails.map((email) => sendCustomerNotification(email)))
}

async function getLatestCustomerStatusOrder(customerId: string) {
  const rows = await db
    .select({ order: orders, round: rounds, supplier: suppliers })
    .from(orders)
    .innerJoin(rounds, eq(rounds.id, orders.roundId))
    .innerJoin(suppliers, eq(suppliers.id, rounds.supplierId))
    .where(
      and(
        eq(orders.customerId, customerId),
        inArray(rounds.status, ["closed", "ready"])
      )
    )
    .orderBy(desc(rounds.closedAt), desc(orders.createdAt))
    .limit(1)

  const row = rows.at(0)
  if (!row) return null

  const orderSummaries = await getOrderSummaries([row.round.id])
  const orderSummary = orderSummaries.find(
    (summary) => summary.id === row.order.id
  )
  if (!orderSummary) return null

  const total = calculateRoundTotals({
    shippingKr: row.round.shippingKr,
    orders: orderSummaries,
  }).find((summary) => summary.orderId === row.order.id)
  if (!total) return null

  return {
    roundId: row.round.id,
    roundStatus: row.round.status as "closed" | "ready",
    supplier: { id: row.supplier.id, name: row.supplier.name },
    closedAt: row.round.closedAt,
    shippingKr: row.round.shippingKr,
    orderId: total.orderId,
    customerName: total.customerName,
    paid: total.paid,
    collected: total.collected,
    items: total.items,
    bagCount: total.items.reduce((sum, item) => sum + item.quantity, 0),
    coffeeSubtotalKr: total.coffeeSubtotalKr,
    shippingShareKr: total.shippingShareKr,
    totalKr: total.totalKr,
  }
}

export const getCustomerHomeData = createServerFn({ method: "GET" }).handler(
  async () => {
    if (!(await getCurrentUser())) return { unlocked: false as const }

    const [openRound, customerRows, selectedCustomer] = await Promise.all([
      getOpenRoundRecord(),
      getActiveCustomers(),
      getSelectedCustomer(),
    ])
    if (!openRound)
      return {
        unlocked: true as const,
        openRound: null,
        customers: customerRows,
        selectedCustomer,
        statusOrder: selectedCustomer
          ? await getLatestCustomerStatusOrder(selectedCustomer.id)
          : null,
      }

    const supplierRows = await db
      .select()
      .from(suppliers)
      .where(eq(suppliers.id, openRound.supplierId))
      .limit(1)
    const supplier = supplierRows.at(0)
    if (!supplier) throw new Error("Supplier not found")
    const [selectedCoffees, orderRows] = await Promise.all([
      db
        .select({
          roundCoffee: roundCoffees,
          coffee: coffees,
        })
        .from(roundCoffees)
        .leftJoin(coffees, eq(coffees.id, roundCoffees.coffeeId))
        .where(eq(roundCoffees.roundId, openRound.id))
        .orderBy(roundCoffees.createdAt),
      getOrderSummaries([openRound.id]),
    ])

    return {
      unlocked: true as const,
      openRound: {
        id: openRound.id,
        closesAt: openRound.closesAt,
        supplier: { id: supplier.id, name: supplier.name },
        coffees: selectedCoffees.map(({ roundCoffee, coffee }) => ({
          id: roundCoffee.id,
          name: roundCoffee.nameSnapshot,
          description: coffee?.description ?? "",
          imageUrl: roundCoffee.imageUrlSnapshot,
          priceKr: roundCoffee.priceKrSnapshot,
        })),
        orders: orderRows,
      },
      customers: customerRows,
      selectedCustomer,
      statusOrder: null,
    }
  }
)

export const getAdminDashboard = createServerFn({ method: "GET" }).handler(
  async () => {
    if (!(await getCurrentUser())?.isAdmin) return { unlocked: false as const }

    const [
      supplierRows,
      coffeeRows,
      customerRows,
      openRound,
      closedRoundRows,
      pickupSlots,
    ] = await Promise.all([
      db.select().from(suppliers).orderBy(suppliers.name),
      db
        .select()
        .from(coffees)
        .where(eq(coffees.isDeleted, false))
        .orderBy(desc(coffees.createdAt)),
      db.select().from(customers).orderBy(customers.name),
      getOpenRoundRecord(),
      db
        .select()
        .from(rounds)
        .where(inArray(rounds.status, ["closed", "ready"]))
        .orderBy(desc(rounds.closedAt)),
      getConfiguredPickupSlots(),
    ])

    const roundIds = [
      ...(openRound ? [openRound.id] : []),
      ...closedRoundRows.map((round) => round.id),
    ]
    const [roundCoffeeRows, orderRows] = await Promise.all([
      roundIds.length > 0
        ? db
            .select()
            .from(roundCoffees)
            .where(inArray(roundCoffees.roundId, roundIds))
            .orderBy(roundCoffees.createdAt)
        : [],
      getOrderSummaries(roundIds),
    ])

    const suppliersById = new Map(
      supplierRows.map((supplier) => [supplier.id, supplier])
    )
    const roundCoffeesByRoundId = groupBy(
      roundCoffeeRows,
      (coffee) => coffee.roundId
    )
    const ordersByRoundId = groupBy(orderRows, (order) => order.roundId)

    return {
      unlocked: true as const,
      suppliers: supplierRows,
      coffees: coffeeRows,
      customers: customerRows,
      pickupSlots,
      openRound: openRound
        ? {
            ...openRound,
            supplier: suppliersById.get(openRound.supplierId) ?? null,
            coffees: roundCoffeesByRoundId.get(openRound.id) ?? [],
            orders: ordersByRoundId.get(openRound.id) ?? [],
          }
        : null,
      closedRounds: closedRoundRows.map((round) => ({
        ...round,
        supplier: suppliersById.get(round.supplierId) ?? null,
        coffees: roundCoffeesByRoundId.get(round.id) ?? [],
        orders: ordersByRoundId.get(round.id) ?? [],
      })),
    }
  }
)

export const getAdminRoundDetail = createServerFn({ method: "GET" })
  .inputValidator((input) => adminRoundDetailSchema.parse(input))
  .handler(async ({ data }) => {
    if (!(await getCurrentUser())?.isAdmin) return { unlocked: false as const }

    const roundRows = await db
      .select()
      .from(rounds)
      .where(eq(rounds.id, data.roundId))
      .limit(1)
    const round = roundRows.at(0)
    if (!round) return { unlocked: true as const, round: null }

    const [supplierRows, roundCoffeeRows, orderRows] = await Promise.all([
      db
        .select()
        .from(suppliers)
        .where(eq(suppliers.id, round.supplierId))
        .limit(1),
      db
        .select()
        .from(roundCoffees)
        .where(eq(roundCoffees.roundId, round.id))
        .orderBy(roundCoffees.createdAt),
      getOrderSummaries([round.id]),
    ])

    return {
      unlocked: true as const,
      round: {
        ...round,
        supplier: supplierRows.at(0) ?? null,
        coffees: roundCoffeeRows,
        orders: orderRows,
      },
    }
  })

export const addCoffee = createServerFn({ method: "POST" })
  .inputValidator((input) => addCoffeeSchema.parse(input))
  .handler(async ({ data }) => {
    await requireAdmin()
    const [coffee] = await db.insert(coffees).values(data).returning()
    return coffee
  })

export const updateCoffee = createServerFn({ method: "POST" })
  .inputValidator((input) => updateCoffeeSchema.parse(input))
  .handler(async ({ data }) => {
    await requireAdmin()
    const [coffee] = await db
      .update(coffees)
      .set({
        supplierId: data.supplierId,
        name: data.name,
        description: data.description,
        imageUrl: data.imageUrl,
        priceKr: data.priceKr,
        isActive: data.isActive,
        updatedAt: new Date(),
      })
      .where(eq(coffees.id, data.id))
      .returning()
    return coffee
  })

export const archiveCoffee = createServerFn({ method: "POST" })
  .inputValidator((input) => archiveCoffeeSchema.parse(input))
  .handler(async ({ data }) => {
    await requireAdmin()
    const [coffee] = await db
      .update(coffees)
      .set({ isDeleted: true, isActive: false, updatedAt: new Date() })
      .where(eq(coffees.id, data.id))
      .returning()
    return coffee
  })

export const openRound = createServerFn({ method: "POST" })
  .inputValidator((input) => openRoundSchema.parse(input))
  .handler(async ({ data }) => {
    await requireAdmin()
    if (await getOpenRoundRecord())
      throw new Error("A coffee round is already open")

    const selectedCoffees = await db
      .select()
      .from(coffees)
      .where(
        and(
          eq(coffees.supplierId, data.supplierId),
          inArray(coffees.id, data.coffeeIds),
          eq(coffees.isActive, true),
          eq(coffees.isDeleted, false)
        )
      )

    if (selectedCoffees.length !== data.coffeeIds.length) {
      throw new Error(
        "All selected coffees must be active and belong to the supplier"
      )
    }

    const [round] = await db
      .insert(rounds)
      .values({
        supplierId: data.supplierId,
        status: "open",
        openedAt: new Date(),
        closesAt: data.closesAt ? new Date(data.closesAt) : null,
      })
      .returning()

    await db.insert(roundCoffees).values(
      selectedCoffees.map((coffee) => ({
        roundId: round.id,
        coffeeId: coffee.id,
        nameSnapshot: coffee.name,
        imageUrlSnapshot: coffee.imageUrl,
        priceKrSnapshot: coffee.priceKr,
      }))
    )

    return round
  })

export const updateRoundDetails = createServerFn({ method: "POST" })
  .inputValidator((input) => updateRoundDetailsSchema.parse(input))
  .handler(async ({ data }) => {
    await requireAdmin()

    const roundRows = await db
      .select()
      .from(rounds)
      .where(eq(rounds.id, data.roundId))
      .limit(1)
    const round = roundRows.at(0)
    if (!round) throw new Error("Round not found")

    const values: Partial<typeof rounds.$inferInsert> = {
      pickupInstructions: data.pickupInstructions,
      updatedAt: new Date(),
    }

    if (round.status === "open") {
      values.closesAt = data.closesAt ? new Date(data.closesAt) : null
    }

    if (round.status === "closed" || round.status === "ready") {
      values.shippingKr = data.shippingKr ?? round.shippingKr
    }

    const [updatedRound] = await db
      .update(rounds)
      .set(values)
      .where(eq(rounds.id, data.roundId))
      .returning()
    return updatedRound
  })

export const closeRound = createServerFn({ method: "POST" })
  .inputValidator((input) => closeRoundSchema.parse(input))
  .handler(async ({ data }) => {
    await requireAdmin()
    const updatedRoundRows = await db
      .update(rounds)
      .set({
        status: "closed",
        closedAt: new Date(),
        shippingKr: data.shippingKr,
        updatedAt: new Date(),
      })
      .where(and(eq(rounds.id, data.roundId), eq(rounds.status, "open")))
      .returning()
    const round = updatedRoundRows.at(0)
    if (!round) throw new Error("Open round not found")
    await notifyRoundCustomers("payment-ready", round.id, round.shippingKr)
    return round
  })

export const updateRoundShipping = createServerFn({ method: "POST" })
  .inputValidator((input) => updateRoundShippingSchema.parse(input))
  .handler(async ({ data }) => {
    await requireAdmin()
    const updatedRoundRows = await db
      .update(rounds)
      .set({ shippingKr: data.shippingKr, updatedAt: new Date() })
      .where(
        and(
          eq(rounds.id, data.roundId),
          inArray(rounds.status, ["closed", "ready"])
        )
      )
      .returning()
    const round = updatedRoundRows.at(0)
    if (!round) throw new Error("Closed round not found")
    return round
  })

export const markRoundReadyForPickup = createServerFn({ method: "POST" })
  .inputValidator((input) => markRoundReadySchema.parse(input))
  .handler(async ({ data }) => {
    await requireAdmin()
    const updatedRoundRows = await db
      .update(rounds)
      .set({ status: "ready", updatedAt: new Date() })
      .where(and(eq(rounds.id, data.roundId), eq(rounds.status, "closed")))
      .returning()
    const round = updatedRoundRows.at(0)
    if (!round) throw new Error("Closed round not found")
    await notifyRoundCustomers("pickup-ready", round.id, round.shippingKr)
    return round
  })

export const setCustomerRole = createServerFn({ method: "POST" })
  .inputValidator((input) => setCustomerRoleSchema.parse(input))
  .handler(async ({ data }) => {
    await requireAdmin()

    const customer = (
      await db
        .update(customers)
        .set({ role: data.role, updatedAt: new Date() })
        .where(eq(customers.id, data.customerId))
        .returning()
    ).at(0)
    if (!customer) throw new Error("Customer not found")
    return customer
  })

export const setCustomerActive = createServerFn({ method: "POST" })
  .inputValidator((input) => setCustomerActiveSchema.parse(input))
  .handler(async ({ data }) => {
    await requireAdmin()

    const customer = (
      await db
        .update(customers)
        .set({ isActive: data.isActive, updatedAt: new Date() })
        .where(eq(customers.id, data.customerId))
        .returning()
    ).at(0)
    if (!customer) throw new Error("Customer not found")
    return customer
  })

export const submitOrder = createServerFn({ method: "POST" })
  .inputValidator((input) => submitOrderSchema.parse(input))
  .handler(async ({ data }) => {
    const selectedCustomer = await getSelectedCustomer()
    if (!selectedCustomer) throw new Error("Du må logge inn")

    const items = data.items.filter((item) => item.quantity > 0)
    if (items.length === 0) throw new Error("Choose at least one coffee")

    const openRoundRows = await db
      .select()
      .from(rounds)
      .where(and(eq(rounds.id, data.roundId), eq(rounds.status, "open")))
      .limit(1)
    const round = openRoundRows.at(0)
    if (!round) throw new Error("This coffee round is no longer open")

    const roundCoffeeRows = await db
      .select()
      .from(roundCoffees)
      .where(
        and(
          eq(roundCoffees.roundId, data.roundId),
          inArray(
            roundCoffees.id,
            items.map((item) => item.roundCoffeeId)
          )
        )
      )

    if (roundCoffeeRows.length !== items.length)
      throw new Error("Invalid coffee selection")

    const [order] = await db
      .insert(orders)
      .values({
        roundId: data.roundId,
        customerId: selectedCustomer.id,
        customerName: selectedCustomer.name,
        customerPhone: selectedCustomer.phone,
        customerEmail: selectedCustomer.email,
      })
      .returning()
    const byId = new Map(roundCoffeeRows.map((coffee) => [coffee.id, coffee]))
    await db.insert(orderItems).values(
      items.map((item) => ({
        orderId: order.id,
        roundCoffeeId: item.roundCoffeeId,
        quantity: item.quantity,
        priceKrSnapshot: byId.get(item.roundCoffeeId)?.priceKrSnapshot ?? 0,
      }))
    )

    if (selectedCustomer.email.trim()) {
      await sendCustomerNotification(
        buildNotificationEmail({
          kind: "order-confirmed",
          to: selectedCustomer.email,
          customerName: selectedCustomer.name,
          orderUrl: buildOrderUrl(order.id, getNotificationBaseUrl()),
        })
      )
    }

    return { ok: true, orderId: order.id }
  })

export const getAvailablePickupSlots = createServerFn({
  method: "GET",
}).handler(async () => {
  if (!(await getCurrentUser())) throw new Error("Du må logge inn")

  return getConfiguredPickupSlots()
})

export const updateOrderPickupSlot = createServerFn({ method: "POST" })
  .inputValidator((input) => updateOrderPickupSlotSchema.parse(input))
  .handler(async ({ data }) => {
    const selectedCustomerId = await getAuthenticatedCustomerId()
    if (!selectedCustomerId) throw new Error("Du må logge inn")

    const selectedSlotId = data.pickupSlotId.trim()
    const selectedSlot = selectedSlotId
      ? (await getConfiguredPickupSlots()).find(
          (slot) => slot.id === selectedSlotId
        )
      : null
    if (selectedSlotId && !selectedSlot)
      throw new Error("Hentetiden er ikke tilgjengelig")

    const orderRows = await db
      .update(orders)
      .set({
        pickupSlotId: selectedSlot?.id ?? "",
        pickupSlotLabel: selectedSlot?.label ?? "",
        pickupStartsAt: selectedSlot ? new Date(selectedSlot.startsAt) : null,
        pickupEndsAt: selectedSlot ? new Date(selectedSlot.endsAt) : null,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(orders.id, data.orderId),
          eq(orders.customerId, selectedCustomerId)
        )
      )
      .returning()
    const order = orderRows.at(0)
    if (!order) throw new Error("Bestillingen finnes ikke")

    return {
      pickupSlotId: order.pickupSlotId,
      pickupSlotLabel: order.pickupSlotLabel,
      pickupStartsAt: order.pickupStartsAt,
      pickupEndsAt: order.pickupEndsAt,
    }
  })

export const getPaymentOrderData = createServerFn({ method: "GET" })
  .inputValidator((input) => z.object({ orderId: uuidSchema }).parse(input))
  .handler(async ({ data }) => {
    const selectedCustomerId = await getAuthenticatedCustomerId()
    if (!selectedCustomerId) throw new Error("Du må logge inn")

    const orderRows = await db
      .select({ order: orders, round: rounds })
      .from(orders)
      .innerJoin(rounds, eq(rounds.id, orders.roundId))
      .where(eq(orders.id, data.orderId))
      .limit(1)
    const row = orderRows.at(0)
    if (!row || row.order.customerId !== selectedCustomerId) return null

    const orderSummaries = await getOrderSummaries([row.order.roundId])
    const orderSummary = orderSummaries.find(
      (summary) => summary.id === data.orderId
    )
    if (!orderSummary) return null

    const total = calculateRoundTotals({
      shippingKr: row.round.shippingKr,
      orders: orderSummaries,
    }).find((summary) => summary.orderId === data.orderId)
    if (!total) return null

    const receiverPhoneNumber = process.env.VIPPS_PHONE_NUMBER ?? ""
    let vippsUrl: string | null = null
    if (receiverPhoneNumber) {
      vippsUrl = buildVippsPaymentUrl({
        phoneNumber: receiverPhoneNumber,
        amountKr: total.totalKr,
        message: createVippsMessage(total.customerName, total.orderId),
      })
    }

    return {
      orderId: total.orderId,
      roundStatus: row.round.status,
      customerName: total.customerName,
      customerPhone: orderSummary.customerPhone,
      createdAt: orderSummary.createdAt,
      paid: total.paid,
      collected: total.collected,
      items: total.items,
      bagCount: total.items.reduce((sum, item) => sum + item.quantity, 0),
      coffeeSubtotalKr: total.coffeeSubtotalKr,
      coffeeVatKr: total.coffeeVatKr,
      shippingShareKr: total.shippingShareKr,
      totalKr: total.totalKr,
      vippsUrl,
      pickupInstructions: row.round.pickupInstructions,
      pickupSlotId: row.order.pickupSlotId,
      pickupSlotLabel: row.order.pickupSlotLabel,
      pickupStartsAt: row.order.pickupStartsAt,
      pickupEndsAt: row.order.pickupEndsAt,
    }
  })

export const deleteOrder = createServerFn({ method: "POST" })
  .inputValidator((input) => deleteOrderSchema.parse(input))
  .handler(async ({ data }) => {
    await requireAdmin()
    await db.delete(orders).where(eq(orders.id, data.orderId))
    return { ok: true }
  })

export const updateOrderFlags = createServerFn({ method: "POST" })
  .inputValidator((input) => updateOrderFlagsSchema.parse(input))
  .handler(async ({ data }) => {
    await requireAdmin()
    const [order] = await db
      .update(orders)
      .set({
        paid: data.paid,
        collected: data.collected,
        updatedAt: new Date(),
      })
      .where(eq(orders.id, data.orderId))
      .returning()
    return order
  })
