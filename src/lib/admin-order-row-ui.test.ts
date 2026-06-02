import { describe, expect, test } from "vitest"
import { getOrderStatusPillClasses } from "./admin-order-row-ui"

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
