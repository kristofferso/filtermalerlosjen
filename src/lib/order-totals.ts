export type RoundTotalsInput = {
  shippingKr: number
  orders: Array<{
    id: string
    customerName: string
    paid: boolean
    collected: boolean
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
  customerName: string
  coffeeSubtotalKr: number
  shippingShareKr: number
  totalKr: number
  paid: boolean
  collected: boolean
  items: Array<{
    name: string
    imageUrl?: string
    quantity: number
    priceKr: number
    subtotalKr: number
  }>
}

export function calculateCoffeeTotals(orders: RoundTotalsInput["orders"]): Array<CoffeeTotal> {
  const totals = new Map<string, CoffeeTotal>()

  for (const order of orders) {
    for (const item of order.items) {
      if (item.quantity <= 0) continue
      const existing = totals.get(item.name) ?? { name: item.name, imageUrl: item.imageUrl ?? "", quantity: 0, totalKr: 0 }
      totals.set(item.name, {
        ...existing,
        imageUrl: existing.imageUrl || item.imageUrl || "",
        quantity: existing.quantity + item.quantity,
        totalKr: existing.totalKr + item.quantity * item.priceKr,
      })
    }
  }

  return Array.from(totals.values()).sort((left, right) => right.quantity - left.quantity || left.name.localeCompare(right.name))
}

export function calculateRoundTotals(input: RoundTotalsInput): Array<OrderTotal> {
  if (input.orders.length === 0) return []

  const baseShippingShare = Math.floor(input.shippingKr / input.orders.length)
  const remainder = input.shippingKr % input.orders.length

  return input.orders.map((order, index) => {
    const items = order.items.map((item) => ({
      ...item,
      subtotalKr: item.quantity * item.priceKr,
    }))
    const coffeeSubtotalKr = items.reduce((sum, item) => sum + item.subtotalKr, 0)
    const shippingShareKr = baseShippingShare + (index < remainder ? 1 : 0)

    return {
      orderId: order.id,
      customerName: order.customerName,
      coffeeSubtotalKr,
      shippingShareKr,
      totalKr: coffeeSubtotalKr + shippingShareKr,
      paid: order.paid,
      collected: order.collected,
      items,
    }
  })
}
