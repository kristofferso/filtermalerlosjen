// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { SupplierVoteBoard } from "./supplier-vote-board"
import type { SupplierBoardEntry } from "@/lib/supplier-votes"

vi.mock("@tanstack/react-router", () => ({
  useRouter: () => ({ invalidate: vi.fn() }),
}))

const castSupplierVote = vi.fn()
vi.mock("@/server/coffee", () => ({
  castSupplierVote: (...args: Array<unknown>) => castSupplierVote(...args),
  withdrawSupplierVote: vi.fn(),
}))

function entry(supplierId: string, name: string, voteCount = 0) {
  return {
    supplierId,
    name,
    imageUrls: [],
    priceRange: { minKr: 70, maxKr: 70 },
    voters: Array.from({ length: voteCount }, (_, index) => ({
      customerId: `c${index}`,
      name: "Anna",
    })),
    voteCount,
  } satisfies SupplierBoardEntry
}

const board = [
  entry("supplier-a", "Solberg Hansen"),
  entry("supplier-b", "Kaffebrenneriet"),
]
const voted = [
  entry("supplier-a", "Solberg Hansen", 1),
  entry("supplier-b", "Kaffebrenneriet"),
]

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe("SupplierVoteBoard", () => {
  it("names the supplier the customer voted for", () => {
    render(<SupplierVoteBoard board={voted} myVoteSupplierId="supplier-a" />)
    expect(
      screen.getByText("Solberg Hansen", { selector: "span" })
    ).toBeTruthy()
  })

  it("shows the vote from the write, and keeps it when a reload returns stale data", async () => {
    castSupplierVote.mockResolvedValue({
      supplierBoard: voted,
      myVoteSupplierId: "supplier-a",
    })

    const { rerender } = render(
      <SupplierVoteBoard board={board} myVoteSupplierId={null} />
    )
    expect(screen.getByText("Du har ikke stemt ennå")).toBeTruthy()

    screen.getAllByRole("button", { name: "Stem" })[0].click()

    await waitFor(() => {
      expect(screen.getByText("1 stemme")).toBeTruthy()
    })
    expect(castSupplierVote).toHaveBeenCalledWith({
      data: { supplierId: "supplier-a" },
    })

    // A stale loader result must not wipe the vote the server just confirmed.
    rerender(<SupplierVoteBoard board={board} myVoteSupplierId={null} />)
    expect(
      screen.getByText("Solberg Hansen", { selector: "span" })
    ).toBeTruthy()
  })

  it("reports the error and keeps the stored vote when saving fails", async () => {
    castSupplierVote.mockRejectedValue(new Error("Nettverket svarte ikke"))

    render(<SupplierVoteBoard board={board} myVoteSupplierId={null} />)
    screen.getAllByRole("button", { name: "Stem" })[0].click()

    await waitFor(() => {
      expect(screen.getByText("Nettverket svarte ikke")).toBeTruthy()
    })
    expect(screen.getByText("Du har ikke stemt ennå")).toBeTruthy()
  })
})
