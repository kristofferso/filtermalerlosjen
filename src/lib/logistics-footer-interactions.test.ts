import { describe, expect, it } from "vitest"
import { getFooterInteractionState } from "./logistics-footer-interactions"

describe("getFooterInteractionState", () => {
  it("single click reveals translated footer copy without opening hidden content", () => {
    expect(
      getFooterInteractionState({ translated: false, open: false }, "click")
    ).toEqual({ translated: true, open: false })
  })

  it("double click opens hidden content and leaves translated footer copy revealed", () => {
    expect(
      getFooterInteractionState(
        { translated: false, open: false },
        "doubleClick"
      )
    ).toEqual({ translated: true, open: true })
  })
})
