export type RoundTotalsInput = {
  shippingKr: number
  orders: Array<{
    id: string
    customerName: string
    paid: boolean
    collected: boolean
    items: Array<{
      name: string
      quantity: number
      priceKr: number
    }>
  }>
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
    quantity: number
    priceKr: number
    subtotalKr: number
  }>
}

export function calculateRoundTotals(input: RoundTotalsInput): OrderTotal[] {
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
