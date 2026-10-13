import { describe, expect, test } from "vitest"
import {
  ROUND_DISPATCH_KINDS,
  isRoundDispatchAvailable,
} from "./round-dispatch"

describe("isRoundDispatchAvailable", () => {
  test("only offers dispatches the round has already passed", () => {
    const available = (status: "draft" | "open" | "closed" | "ready") =>
      ROUND_DISPATCH_KINDS.filter((kind) =>
        isRoundDispatchAvailable(kind, status)
      )

    expect(available("draft")).toEqual([])
    expect(available("open")).toEqual(["round-opened", "order-confirmed"])
    expect(available("closed")).toEqual([
      "round-opened",
      "order-confirmed",
      "payment-ready",
    ])
    expect(available("ready")).toEqual([...ROUND_DISPATCH_KINDS])
  })
})
