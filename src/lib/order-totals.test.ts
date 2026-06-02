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
            {
              name: "Kenya",
              imageUrl: "https://example.com/kenya.jpg",
              quantity: 2,
              priceKr: 100,
            },
            { name: "Brazil", imageUrl: "", quantity: 1, priceKr: 120 },
          ],
        },
        {
          id: "order-2",
          customerName: "Marius",
          paid: false,
          collected: false,
          items: [
            {
              name: "Kenya",
              imageUrl: "https://example.com/kenya.jpg",
              quantity: 3,
              priceKr: 100,
            },
          ],
        },
      ])
    ).toEqual([
      {
        name: "Kenya",
        imageUrl: "https://example.com/kenya.jpg",
        quantity: 5,
        totalKr: 575,
      },
      { name: "Brazil", imageUrl: "", quantity: 1, totalKr: 138 },
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
        coffeeSubtotalKr: 230,
        coffeeVatKr: 30,
        shippingShareKr: 30,
        totalKr: 260,
        paid: false,
        collected: false,
        items: [{ name: "Kenya", quantity: 2, priceKr: 100, subtotalKr: 230 }],
      },
      {
        orderId: "order-2",
        customerName: "Marius",
        coffeeSubtotalKr: 138,
        coffeeVatKr: 18,
        shippingShareKr: 30,
        totalKr: 168,
        paid: true,
        collected: false,
        items: [{ name: "Brazil", quantity: 1, priceKr: 120, subtotalKr: 138 }],
      },
    ])
  })

  it("handles no orders", () => {
    expect(calculateRoundTotals({ shippingKr: 60, orders: [] })).toEqual([])
  })
})
