import { describe, expect, it } from "vitest"
import { buildSupplierBoard } from "./supplier-votes"

const supplierA = { id: "supplier-a", name: "Solberg Hansen" }
const supplierB = { id: "supplier-b", name: "Kaffebrenneriet" }

function coffee(
  supplierId: string,
  overrides: Partial<{
    imageUrl: string
    priceKr: number
    isActive: boolean
    isDeleted: boolean
  }> = {}
) {
  return {
    supplierId,
    imageUrl: "https://example.com/bean.png",
    priceKr: 70,
    isActive: true,
    isDeleted: false,
    ...overrides,
  }
}

describe("buildSupplierBoard", () => {
  it("derives a price range from a single coffee", () => {
    const [entry] = buildSupplierBoard({
      suppliers: [supplierA],
      coffees: [coffee(supplierA.id, { priceKr: 75 })],
      votes: [],
    })
    expect(entry.priceRange).toEqual({ minKr: 75, maxKr: 75 })
  })

  it("derives a price range across many coffees", () => {
    const [entry] = buildSupplierBoard({
      suppliers: [supplierA],
      coffees: [
        coffee(supplierA.id, { priceKr: 63 }),
        coffee(supplierA.id, { priceKr: 79 }),
        coffee(supplierA.id, { priceKr: 70 }),
      ],
      votes: [],
    })
    expect(entry.priceRange).toEqual({ minKr: 63, maxKr: 79 })
  })

  it("excludes suppliers without any active, non-deleted coffee", () => {
    const board = buildSupplierBoard({
      suppliers: [supplierA, supplierB],
      coffees: [
        coffee(supplierA.id, { isActive: false }),
        coffee(supplierA.id, { isDeleted: true }),
        coffee(supplierB.id),
      ],
      votes: [],
    })
    expect(board.map((entry) => entry.supplierId)).toEqual([supplierB.id])
  })

  it("caps and cleans the image stack", () => {
    const [entry] = buildSupplierBoard({
      suppliers: [supplierA],
      coffees: [
        coffee(supplierA.id, { imageUrl: "https://example.com/1.png" }),
        coffee(supplierA.id, { imageUrl: "" }),
        coffee(supplierA.id, { imageUrl: "https://example.com/2.png" }),
        coffee(supplierA.id, { imageUrl: "https://example.com/3.png" }),
        coffee(supplierA.id, { imageUrl: "https://example.com/4.png" }),
        coffee(supplierA.id, { imageUrl: "https://example.com/5.png" }),
      ],
      maxImages: 3,
      votes: [],
    })
    expect(entry.imageUrls).toEqual([
      "https://example.com/1.png",
      "https://example.com/2.png",
      "https://example.com/3.png",
    ])
  })

  it("maps voters to each supplier and counts them", () => {
    const [entry] = buildSupplierBoard({
      suppliers: [supplierA],
      coffees: [coffee(supplierA.id)],
      votes: [
        { supplierId: supplierA.id, customerId: "c1", customerName: "Anna" },
        { supplierId: supplierA.id, customerId: "c2", customerName: "Bjørn" },
      ],
    })
    expect(entry.voteCount).toBe(2)
    expect(entry.voters).toEqual([
      { customerId: "c1", name: "Anna" },
      { customerId: "c2", name: "Bjørn" },
    ])
  })

  it("sorts by vote count descending, then by name", () => {
    const supplierC = { id: "supplier-c", name: "Tim Wendelboe" }
    const board = buildSupplierBoard({
      suppliers: [supplierA, supplierB, supplierC],
      coffees: [
        coffee(supplierA.id),
        coffee(supplierB.id),
        coffee(supplierC.id),
      ],
      votes: [
        { supplierId: supplierC.id, customerId: "c1", customerName: "Anna" },
        { supplierId: supplierC.id, customerId: "c2", customerName: "Bjørn" },
        { supplierId: supplierA.id, customerId: "c3", customerName: "Cecilie" },
      ],
    })
    // Tim Wendelboe (2 votes), then a tie at 1/0 broken by name.
    expect(board.map((entry) => entry.name)).toEqual([
      "Tim Wendelboe",
      "Solberg Hansen",
      "Kaffebrenneriet",
    ])
  })
})
