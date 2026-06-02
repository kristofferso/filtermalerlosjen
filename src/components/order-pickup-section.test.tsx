import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"
import { OrderPickupSection } from "./order-pickup-section"

vi.mock("@tanstack/react-router", () => ({
  useRouter: () => ({ invalidate: vi.fn() }),
}))

vi.mock("@/server/coffee", () => ({
  updateOrderPickupSlot: vi.fn(),
}))

const baseOrder = {
  orderId: "order-1",
  collected: false,
  pickupSlotId: "slot-1",
  pickupInstructions: "Hentes i bakgården etter avtale.",
}

const slots = [
  {
    id: "slot-1",
    startsAt: "2026-06-05T14:00:00.000Z",
    endsAt: "2026-06-05T15:00:00.000Z",
    dateLabel: "Fredag",
    timeLabel: "16:00",
    label: "Fredag, 16:00",
  },
  {
    id: "slot-2",
    startsAt: "2026-06-05T15:00:00.000Z",
    endsAt: "2026-06-05T16:00:00.000Z",
    dateLabel: "Fredag",
    timeLabel: "17:00",
    label: "Fredag, 17:00",
  },
]

describe("OrderPickupSection", () => {
  it("shows instructions before pickup time selection", () => {
    const markup = renderToStaticMarkup(
      <OrderPickupSection order={baseOrder} slots={slots} />
    )

    expect(markup).toContain("Henting")
    expect(markup).toContain("Instruksjoner")
    expect(markup).toContain("Hentes i bakgården etter avtale.")
    expect(markup).toContain("Velg tid")
    expect(markup).toContain("Valgt hentetid")
    expect(markup).not.toContain("overflow-x-auto")
  })

  it("shows a clear picked up state with a checkmark when collected", () => {
    const markup = renderToStaticMarkup(
      <OrderPickupSection order={{ ...baseOrder, collected: true }} slots={slots} />
    )

    expect(markup).toContain("Hentet")
    expect(markup).toContain("Du har hentet! På tide å komme i gang med bryggingen")
    expect(markup).toContain("aria-label=\"Bestillingen er hentet\"")
    expect(markup).not.toContain("Instruksjoner")
    expect(markup).not.toContain("Velg tid")
    expect(markup).not.toContain("Hentes i bakgården etter avtale.")
  })
})
