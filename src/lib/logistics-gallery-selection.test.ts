import { describe, expect, it } from "vitest"
import {
  getCenteredGalleryItemId,
  getNextCenteredGalleryItemId,
} from "./logistics-gallery-selection"

describe("getCenteredGalleryItemId", () => {
  it("selects the item closest to the viewport center", () => {
    expect(
      getCenteredGalleryItemId(
        [
          { id: "first", center: 180 },
          { id: "second", center: 520 },
        ],
        200
      )
    ).toBe("first")
  })

  it("returns null for an empty gallery", () => {
    expect(getCenteredGalleryItemId([], 200)).toBeNull()
  })
})

describe("getNextCenteredGalleryItemId", () => {
  it("returns null when the centered item is already selected", () => {
    expect(
      getNextCenteredGalleryItemId(
        [
          { id: "first", center: 180 },
          { id: "second", center: 520 },
        ],
        200,
        "first"
      )
    ).toBeNull()
  })

  it("returns the next centered item when selection changes", () => {
    expect(
      getNextCenteredGalleryItemId(
        [
          { id: "first", center: 180 },
          { id: "second", center: 205 },
        ],
        200,
        "first"
      )
    ).toBe("second")
  })
})
