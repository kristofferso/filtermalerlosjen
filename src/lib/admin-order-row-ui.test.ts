import { describe, expect, test } from "vitest"
import {
  getOrderStatusPillClasses,
  getPickupChecklistInitialState,
  getPickupChecklistSummary,
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
})
