import { describe, expect, test } from "vitest"
import {
  getOrderMoneyDetailRows,
  getOrderStatusPillClasses,
  getPickupChecklistInitialState,
  getPickupChecklistSummary,
  getPickupScannerTone,
  shouldOfferPickupMode,
} from "./admin-order-row-ui"

describe("getOrderStatusPillClasses", () => {
  test("uses muted dark-mode friendly status backgrounds", () => {
    expect(getOrderStatusPillClasses("payment", true)).toContain(
      "bg-emerald-500/10"
    )
    expect(getOrderStatusPillClasses("payment", false)).toContain("bg-muted/30")
    expect(getOrderStatusPillClasses("pickup", true)).toContain("bg-sky-500/10")
    expect(getOrderStatusPillClasses("pickup", false)).toContain("bg-muted/30")
  })
})

describe("pickup mode checklist helpers", () => {
  const items = [
    { name: "La Fuente", quantity: 2 },
    { name: "El Bosque", quantity: 1 },
    { name: "Zero", quantity: 0 },
  ]

  test("starts unchecked for visible products until collected", () => {
    expect(getPickupChecklistInitialState(items, false)).toEqual({
      "La Fuente": false,
      "El Bosque": false,
    })

    expect(getPickupChecklistInitialState(items, true)).toEqual({
      "La Fuente": true,
      "El Bosque": true,
    })
  })

  test("summarizes checked products and bag totals", () => {
    expect(
      getPickupChecklistSummary(items, {
        "La Fuente": true,
        "El Bosque": false,
      })
    ).toEqual({
      productCount: 2,
      checkedCount: 1,
      bagCount: 3,
      allChecked: false,
    })

    expect(
      getPickupChecklistSummary(items, {
        "La Fuente": true,
        "El Bosque": true,
      }).allChecked
    ).toBe(true)
  })

  test("hides pickup mode once the order is collected", () => {
    expect(shouldOfferPickupMode(false)).toBe(true)
    expect(shouldOfferPickupMode(true)).toBe(false)
  })

  test("uses distinct scanner tones for checking and unchecking", () => {
    expect(getPickupScannerTone(true)).toEqual({
      frequencyHz: 1320,
      durationMs: 70,
      label: "checked",
    })
    expect(getPickupScannerTone(false)).toEqual({
      frequencyHz: 220,
      durationMs: 110,
      label: "unchecked",
    })
  })
})

describe("order money details", () => {
  test("formats money rows for the details dialog", () => {
    expect(
      getOrderMoneyDetailRows({
        coffeeSubtotalKr: 300,
        shippingShareKr: 25,
        totalKr: 325,
      })
    ).toEqual([
      { label: "Kaffe", value: "300 kr", emphasis: false },
      { label: "Frakt", value: "25 kr", emphasis: false },
      { label: "Totalt", value: "325 kr", emphasis: true },
    ])
  })
})
