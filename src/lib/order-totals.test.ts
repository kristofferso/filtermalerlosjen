import { describe, expect, it } from "vitest"
import { formatKr } from "./money"
import { calculateCoffeeTotals, calculateRoundTotals } from "./order-totals"

describe("formatKr", () => {
  it("formats whole kroner", () => {
    expect(formatKr(139)).toBe("139 kr")
  })
})

describe("calculateCoffeeTotals", () => {
  it("groups quantities and subtotals by coffee", () => {
    expect(
      calculateCoffeeTotals([
        {
          id: "order-1",
          customerName: "Anna",
          paid: false,
          collected: false,
          items: [
            { name: "Kenya", imageUrl: "https://example.com/kenya.jpg", quantity: 2, priceKr: 100 },
            { name: "Brazil", imageUrl: "", quantity: 1, priceKr: 120 },
          ],
        },
        {
          id: "order-2",
          customerName: "Marius",
          paid: false,
          collected: false,
          items: [{ name: "Kenya", imageUrl: "https://example.com/kenya.jpg", quantity: 3, priceKr: 100 }],
        },
      ]),
    ).toEqual([
      { name: "Kenya", imageUrl: "https://example.com/kenya.jpg", quantity: 5, totalKr: 500 },
      { name: "Brazil", imageUrl: "", quantity: 1, totalKr: 120 },
    ])
  })
})

describe("calculateRoundTotals", () => {
  it("splits shipping evenly across orders", () => {
    const totals = calculateRoundTotals({
      shippingKr: 60,
      orders: [
        {
          id: "order-1",
          customerName: "Anna",
          paid: false,
          collected: false,
          items: [{ name: "Kenya", quantity: 2, priceKr: 100 }],
        },
        {
          id: "order-2",
          customerName: "Marius",
          paid: true,
          collected: false,
          items: [{ name: "Brazil", quantity: 1, priceKr: 120 }],
        },
      ],
    })

    expect(totals).toEqual([
      {
        orderId: "order-1",
        customerName: "Anna",
        coffeeSubtotalKr: 200,
        shippingShareKr: 30,
        totalKr: 230,
        paid: false,
        collected: false,
        items: [{ name: "Kenya", quantity: 2, priceKr: 100, subtotalKr: 200 }],
      },
      {
        orderId: "order-2",
        customerName: "Marius",
        coffeeSubtotalKr: 120,
        shippingShareKr: 30,
        totalKr: 150,
        paid: true,
        collected: false,
        items: [{ name: "Brazil", quantity: 1, priceKr: 120, subtotalKr: 120 }],
      },
    ])
  })

  it("handles no orders", () => {
    expect(calculateRoundTotals({ shippingKr: 60, orders: [] })).toEqual([])
  })
})
