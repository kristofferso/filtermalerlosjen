import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"
import { PaymentCard } from "./bestilling.$orderId"
import type { ReactNode } from "react"

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    children,
    to,
    className,
  }: {
    children?: ReactNode
    to?: string
    className?: string
  }) => (
    <a href={to} className={className}>
      {children}
    </a>
  ),
  createFileRoute: () => (config: unknown) => config,
  lazyRouteComponent: () => null,
  redirect: (value: unknown) => value,
  useRouter: () => ({ invalidate: () => Promise.resolve() }),
}))

vi.mock("@/server/coffee", () => ({
  getAvailablePickupSlots: () => Promise.resolve([]),
  getPaymentOrderData: () => Promise.resolve(null),
  updateOrderPickupSlot: () => Promise.resolve({}),
}))

vi.mock("@/server/customer-access", () => ({
  getCustomerRouteAccess: () =>
    Promise.resolve({
      authenticated: true,
      customerId: "customer-1",
    }),
}))

vi.mock("@/lib/customer-route-guard", () => ({
  getCustomerLoginRedirect: () => null,
}))

const baseOrder: Parameters<typeof PaymentCard>[0]["order"] = {
  orderId: "order-1",
  roundStatus: "closed",
  customerName: "Ola Nordmann",
  customerPhone: "12345678",
  createdAt: new Date("2026-06-01T12:00:00.000Z"),
  paid: false,
  collected: false,
  items: [
    {
      name: "Testkaffe",
      quantity: 1,
      priceKr: 100,
      subtotalKr: 100,
    },
  ],
  bagCount: 1,
  coffeeSubtotalKr: 100,
  coffeeVatKr: 0,
  shippingShareKr: 20,
  totalKr: 120,
  vippsUrl: null,
  pickupInstructions: "Hentes i bakgården etter avtale.",
  pickupSlotId: "",
  pickupSlotLabel: "",
  pickupStartsAt: null,
  pickupEndsAt: null,
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
]

describe("PaymentCard pickup visibility", () => {
  it("hides pickup details when the round is not ready", () => {
    const markup = renderToStaticMarkup(
      <PaymentCard order={baseOrder} pickupSlots={slots} />
    )

    expect(markup).toContain("Betaling")
    expect(markup).not.toContain("Henting")
    expect(markup).not.toContain("Hentes i bakgården etter avtale.")
    expect(markup).not.toContain("Valgt hentetid")
  })

  it("shows pickup details when the round is ready", () => {
    const markup = renderToStaticMarkup(
      <PaymentCard
        order={{ ...baseOrder, roundStatus: "ready" }}
        pickupSlots={slots}
      />
    )

    expect(markup).toContain("Henting")
    expect(markup).toContain("Hentes i bakgården etter avtale.")
    expect(markup).toContain("Valgt hentetid")
  })
})
