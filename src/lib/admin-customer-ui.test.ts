import { describe, expect, test } from "vitest"
import {
  getCustomerEmailHref,
  getCustomerPhoneHref,
  getCustomerRowClasses,
} from "./admin-customer-ui"

describe("admin customer contact helpers", () => {
  test("builds tel and mailto links", () => {
    expect(getCustomerPhoneHref("+47 12 34 56 78")).toBe("tel:+4712345678")
    expect(getCustomerEmailHref("kari@example.test")).toBe(
      "mailto:kari@example.test"
    )
  })

  test("highlights only the selected customer row", () => {
    expect(getCustomerRowClasses("customer-1", "customer-1")).toContain(
      "bg-primary/5"
    )
    expect(getCustomerRowClasses("customer-2", "customer-1")).not.toContain(
      "bg-primary/5"
    )
  })
})
