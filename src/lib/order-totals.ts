import { addCoffeeVat, calculateCoffeeVat } from "./vat"

export type RoundTotalsInput = {
  shippingKr: number
  orders: Array<{
    id: string
    customerId?: string | null
    customerName: string
    paid: boolean
    collected: boolean
    pickupSlotLabel?: string
    items: Array<{
      name: string
      imageUrl?: string
      quantity: number
      priceKr: number
    }>
  }>
}

export type CoffeeTotal = {
  name: string
  imageUrl: string
  quantity: number
  totalKr: number
}

export type OrderTotal = {
  orderId: string
  customerId?: string
  customerName: string
  coffeeSubtotalKr: number
  coffeeVatKr: number
  shippingShareKr: number
  totalKr: number
  paid: boolean
  collected: boolean
  pickupSlotLabel?: string
  items: Array<{
    name: string
    imageUrl?: string
    quantity: number
    priceKr: number
    subtotalKr: number
  }>
}

export type OrderLeaderboardEntry = {
  orderId: string
  customerName: string
  bagCount: number
  totalKr: number
}

export type RoundGrandTotals = {
  bagCount: number
  coffeeSubtotalKr: number
  shippingKr: number
  totalKr: number
}

export type CustomerOrderStatusInput = {
  roundStatus: "closed" | "ready"
  paid: boolean
  collected: boolean
}

export type CustomerOrderStep = {
  id: "ordered" | "delivery" | "payment" | "pickup"
  label: string
  complete: boolean
}

export type CustomerOrderState = {
  headline: string
  steps: Array<CustomerOrderStep>
}

export function calculateOrderLeaderboard(
  orders: RoundTotalsInput["orders"]
): Array<OrderLeaderboardEntry> {
  return orders
    .map((order) => {
      const bagCount = order.items.reduce(
        (sum, item) => sum + Math.max(0, item.quantity),
        0
      )
      const totalKr = order.items.reduce(
        (sum, item) =>
          sum + addCoffeeVat(Math.max(0, item.quantity) * item.priceKr),
        0
      )

      return {
        orderId: order.id,
        customerName: order.customerName,
        bagCount,
        totalKr,
      }
    })
    .filter((entry) => entry.bagCount > 0)
    .sort(
      (left, right) =>
        right.bagCount - left.bagCount ||
        right.totalKr - left.totalKr ||
        left.customerName.localeCompare(right.customerName, "nb-NO")
    )
}

export function calculateCoffeeTotals(
  orders: RoundTotalsInput["orders"]
): Array<CoffeeTotal> {
  const totals = new Map<string, CoffeeTotal>()

  for (const order of orders) {
    for (const item of order.items) {
      if (item.quantity <= 0) continue
      const existing = totals.get(item.name) ?? {
        name: item.name,
        imageUrl: item.imageUrl ?? "",
        quantity: 0,
        totalKr: 0,
      }
      totals.set(item.name, {
        ...existing,
        imageUrl: existing.imageUrl || item.imageUrl || "",
        quantity: existing.quantity + item.quantity,
        totalKr: existing.totalKr + addCoffeeVat(item.quantity * item.priceKr),
      })
    }
  }

  return Array.from(totals.values()).sort(
    (left, right) =>
      right.quantity - left.quantity || left.name.localeCompare(right.name)
  )
}

export function calculateRoundTotals(
  input: RoundTotalsInput
): Array<OrderTotal> {
  if (input.orders.length === 0) return []

  const baseShippingShare = Math.floor(input.shippingKr / input.orders.length)
  const remainder = input.shippingKr % input.orders.length

  return input.orders.map((order, index) => {
    const items = order.items.map((item) => ({
      ...item,
      subtotalKr: addCoffeeVat(item.quantity * item.priceKr),
    }))
    const coffeeSubtotalKr = items.reduce(
      (sum, item) => sum + item.subtotalKr,
      0
    )
    const coffeeVatKr = order.items.reduce(
      (sum, item) => sum + calculateCoffeeVat(item.quantity * item.priceKr),
      0
    )
    const shippingShareKr = baseShippingShare + (index < remainder ? 1 : 0)

    return {
      orderId: order.id,
      ...(order.customerId ? { customerId: order.customerId } : {}),
      customerName: order.customerName,
      coffeeSubtotalKr,
      coffeeVatKr,
      shippingShareKr,
      totalKr: coffeeSubtotalKr + shippingShareKr,
      paid: order.paid,
      collected: order.collected,
      ...(order.pickupSlotLabel
        ? { pickupSlotLabel: order.pickupSlotLabel }
        : {}),
      items,
    }
  })
}

export function calculateRoundGrandTotals(
  input: RoundTotalsInput
): RoundGrandTotals {
  const orderTotals = calculateRoundTotals(input)
  return {
    bagCount: input.orders.reduce(
      (sum, order) =>
        sum + order.items.reduce((itemSum, item) => itemSum + item.quantity, 0),
      0
    ),
    coffeeSubtotalKr: orderTotals.reduce(
      (sum, order) => sum + order.coffeeSubtotalKr,
      0
    ),
    shippingKr: input.shippingKr,
    totalKr: orderTotals.reduce((sum, order) => sum + order.totalKr, 0),
  }
}

export function getCustomerOrderState({
  collected,
  paid,
  roundStatus,
}: CustomerOrderStatusInput): CustomerOrderState {
  const hasArrived = roundStatus === "ready"
  const headline = collected
    ? "Hentet"
    : paid
      ? "Betalt og klar til henting"
      : hasArrived
        ? "Kan hentes og betales"
        : "På vei"

  return {
    headline,
    steps: [
      { id: "ordered", label: "Bestilt", complete: true },
      {
        id: "delivery",
        label: hasArrived ? "Ankommet" : "På vei",
        complete: hasArrived,
      },
      { id: "payment", label: paid ? "Betalt" : "Må betales", complete: paid },
      {
        id: "pickup",
        label: collected ? "Hentet" : "Klar til henting",
        complete: collected,
      },
    ],
  }
}

export function getCustomerOrderStatus(input: CustomerOrderStatusInput) {
  return getCustomerOrderState(input).headline
}
