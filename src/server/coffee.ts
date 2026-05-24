import { createServerFn } from "@tanstack/react-start"
import { and, desc, eq, inArray } from "drizzle-orm"
import { z } from "zod"
import { assertAdmin, isAdminUnlocked, isCustomerUnlocked } from "./auth.server"
import { db } from "@/db/client"
import {
  coffees,
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
})
const closeRoundSchema = z.object({
  roundId: uuidSchema,
  shippingKr: z.number().int().min(0),
})
const submitOrderSchema = z.object({
  roundId: uuidSchema,
  customerName: z.string().trim().min(1).max(80),
  items: z.array(
    z.object({
      roundCoffeeId: uuidSchema,
      quantity: z.number().int().min(0).max(50),
    })
  ),
})
const archiveCoffeeSchema = z.object({ id: uuidSchema })
const deleteOrderSchema = z.object({ orderId: uuidSchema })
const updateOrderFlagsSchema = z.object({
  orderId: uuidSchema,
  paid: z.boolean(),
  collected: z.boolean(),
})

async function getOpenRoundRecord() {
  const openRoundRows = await db
    .select()
    .from(rounds)
    .where(eq(rounds.status, "open"))
    .limit(1)
  return openRoundRows.at(0) ?? null
}

function groupBy<T, TKey>(items: Array<T>, getKey: (item: T) => TKey) {
  const grouped = new Map<TKey, Array<T>>()
  for (const item of items) {
    const key = getKey(item)
    grouped.set(key, [...(grouped.get(key) ?? []), item])
  }
  return grouped
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
      customerName: string
      paid: boolean
      collected: boolean
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
        customerName: row.order.customerName,
        paid: row.order.paid,
        collected: row.order.collected,
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

export const getCustomerHomeData = createServerFn({ method: "GET" }).handler(
  async () => {
    if (!(await isCustomerUnlocked())) return { unlocked: false as const }

    const openRound = await getOpenRoundRecord()
    if (!openRound) return { unlocked: true as const, openRound: null }

    const supplierRows = await db
      .select()
      .from(suppliers)
      .where(eq(suppliers.id, openRound.supplierId))
      .limit(1)
    const supplier = supplierRows.at(0)
    if (!supplier) throw new Error("Supplier not found")
    const selectedCoffees = await db
      .select({
        roundCoffee: roundCoffees,
        coffee: coffees,
      })
      .from(roundCoffees)
      .leftJoin(coffees, eq(coffees.id, roundCoffees.coffeeId))
      .where(eq(roundCoffees.roundId, openRound.id))
      .orderBy(roundCoffees.createdAt)

    return {
      unlocked: true as const,
      openRound: {
        id: openRound.id,
        supplier: { id: supplier.id, name: supplier.name },
        coffees: selectedCoffees.map(({ roundCoffee, coffee }) => ({
          id: roundCoffee.id,
          name: roundCoffee.nameSnapshot,
          description: coffee?.description ?? "",
          imageUrl: roundCoffee.imageUrlSnapshot,
          priceKr: roundCoffee.priceKrSnapshot,
        })),
      },
    }
  }
)

export const getAdminDashboard = createServerFn({ method: "GET" }).handler(
  async () => {
    if (!(await isAdminUnlocked())) return { unlocked: false as const }

    const [supplierRows, coffeeRows, openRound, closedRoundRows] =
      await Promise.all([
        db.select().from(suppliers).orderBy(suppliers.name),
        db
          .select()
          .from(coffees)
          .where(eq(coffees.isDeleted, false))
          .orderBy(desc(coffees.createdAt)),
        getOpenRoundRecord(),
        db
          .select()
          .from(rounds)
          .where(eq(rounds.status, "closed"))
          .orderBy(desc(rounds.closedAt))
          .limit(10),
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

export const addCoffee = createServerFn({ method: "POST" })
  .inputValidator((input) => addCoffeeSchema.parse(input))
  .handler(async ({ data }) => {
    await assertAdmin()
    const [coffee] = await db.insert(coffees).values(data).returning()
    return coffee
  })

export const updateCoffee = createServerFn({ method: "POST" })
  .inputValidator((input) => updateCoffeeSchema.parse(input))
  .handler(async ({ data }) => {
    await assertAdmin()
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
    await assertAdmin()
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
    await assertAdmin()
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

export const closeRound = createServerFn({ method: "POST" })
  .inputValidator((input) => closeRoundSchema.parse(input))
  .handler(async ({ data }) => {
    await assertAdmin()
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
    return round
  })

export const submitOrder = createServerFn({ method: "POST" })
  .inputValidator((input) => submitOrderSchema.parse(input))
  .handler(async ({ data }) => {
    if (!(await isCustomerUnlocked()))
      throw new Error("Customer access required")

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
      .values({ roundId: data.roundId, customerName: data.customerName })
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

    return { ok: true, orderId: order.id }
  })

export const deleteOrder = createServerFn({ method: "POST" })
  .inputValidator((input) => deleteOrderSchema.parse(input))
  .handler(async ({ data }) => {
    await assertAdmin()
    await db.delete(orders).where(eq(orders.id, data.orderId))
    return { ok: true }
  })

export const updateOrderFlags = createServerFn({ method: "POST" })
  .inputValidator((input) => updateOrderFlagsSchema.parse(input))
  .handler(async ({ data }) => {
    await assertAdmin()
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
