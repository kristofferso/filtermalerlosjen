import { describe, expect, it } from "vitest"
import { logisticsGalleryClasses } from "./logistics-gallery-layout"

describe("logisticsGalleryClasses", () => {
  it("uses a centered snap carousel on small screens", () => {
    expect(logisticsGalleryClasses.list).toContain("snap-x")
    expect(logisticsGalleryClasses.list).toContain("snap-mandatory")
    expect(logisticsGalleryClasses.list).toContain("overflow-x-auto")
    expect(logisticsGalleryClasses.item).toContain("snap-center")
  })

  it("switches back to the grid layout from medium screens", () => {
    expect(logisticsGalleryClasses.list).toContain("md:grid")
    expect(logisticsGalleryClasses.list).toContain("md:grid-cols-3")
    expect(logisticsGalleryClasses.list).toContain("xl:grid-cols-4")
    expect(logisticsGalleryClasses.item).toContain("md:w-auto")
  })
})
