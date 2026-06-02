import { Link, createFileRoute, redirect } from "@tanstack/react-router"
import { ChevronLeft } from "lucide-react"
import type { PickupSlot } from "@/lib/pickup-slots"
import { BrandLogo } from "@/components/brand"
import { OrderPaymentSection } from "@/components/order-payment-section"
import { OrderPickupSection } from "@/components/order-pickup-section"
import { OrderStatusStepper } from "@/components/order-status-stepper"
import { getCustomerLoginRedirect } from "@/lib/customer-route-guard"
import { formatKr } from "@/lib/money"
import { getCustomerOrderStatus } from "@/lib/order-totals"
import { getCustomerRouteAccess } from "@/server/customer-access"
import {
  getAvailablePickupSlots,
  getPaymentOrderData,
} from "@/server/coffee"

export const Route = createFileRoute("/bestilling/$orderId")({
  loader: async ({ location, params }) => {
    const access = await getCustomerRouteAccess()
    const loginRedirect = getCustomerLoginRedirect({
      unlocked: access.unlocked,
      hasSelectedCustomer: Boolean(access.selectedCustomerId),
      currentPath: location.href,
    })
    if (loginRedirect) throw redirect(loginRedirect)

    const [order, pickupSlots] = await Promise.all([
      getPaymentOrderData({ data: { orderId: params.orderId } }),
      getAvailablePickupSlots(),
    ])
    return { order, pickupSlots }
  },
  component: PaymentPage,
})

function PaymentPage() {
  const { order, pickupSlots } = Route.useLoaderData()

  return (
    <main className="min-h-svh text-foreground">
      <section
        className="relative flex min-h-svh w-full flex-col items-center justify-start overflow-hidden px-4 pt-10 pb-24 sm:pt-14"
        style={{
          backgroundColor: "rgb(0 0 0)",
          backgroundImage: "url('/bg.png')",
          backgroundPosition: "top center",
          backgroundRepeat: "no-repeat",
          backgroundSize: "max(600px, 100%) auto",
        }}
      >
        <div
          className="pointer-events-none absolute inset-x-0 top-0"
          style={{
            height: "max(600px, 100vw)",
            backgroundImage:
              "linear-gradient(to bottom, rgb(0 0 0 / 0) 54%, rgb(0 0 0 / 0.92) 100%)",
          }}
          aria-hidden="true"
        />
        <div className="relative z-10 w-full max-w-lg rounded-2xl border border-border bg-card/95 p-6 text-card-foreground shadow-2xl shadow-black/20 sm:p-8">
          <Link
            to="/"
            className="mb-6 inline-flex items-center gap-1.5 rounded-md text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card focus-visible:outline-none"
          >
            <ChevronLeft className="size-4" aria-hidden="true" />
            Tilbake til oversikt
          </Link>

          <div className="text-center">
            <p className="font-mono text-[0.7rem] tracking-[0.22em] text-muted-foreground uppercase">
              Bestilling #{order?.orderId.slice(0, 8)}
            </p>
            <h1 className="mt-3 font-serif text-4xl font-normal tracking-tight text-balance sm:text-5xl">
              {order
                ? getCustomerOrderStatus({
                    roundStatus:
                      order.roundStatus === "ready" ? "ready" : "closed",
                    paid: order.paid,
                    collected: order.collected,
                  })
                : "Din bestilling"}
            </h1>
          </div>

          {!order ? (
            <MissingOrder />
          ) : (
            <PaymentCard order={order} pickupSlots={pickupSlots} />
          )}
        </div>

        <BrandLogo
          white
          decorative
          className="pointer-events-none mt-5 h-8 w-auto opacity-55 sm:bottom-6"
        />
      </section>
    </main>
  )
}

type PaymentOrder = NonNullable<Awaited<ReturnType<typeof getPaymentOrderData>>>

export function PaymentCard({
  order,
  pickupSlots,
}: {
  order: PaymentOrder
  pickupSlots: Array<PickupSlot>
}) {
  return (
    <div className="mt-8">
      <div className="flex items-baseline justify-between gap-4 border-b border-border pb-4">
        <div>
          <p className="mt-1 text-xl font-semibold">{order.customerName}</p>
          <p className="mt-1 font-mono text-xs text-muted-foreground">
            {formatDate(order.createdAt)}
          </p>
        </div>
        <p className="font-mono text-sm text-muted-foreground">
          {order.bagCount} poser
        </p>
      </div>

      <div className="mt-5 rounded-lg border border-border bg-muted/30 p-4">
        <OrderStatusStepper
          roundStatus={order.roundStatus === "ready" ? "ready" : "closed"}
          paid={order.paid}
          collected={order.collected}
        />
      </div>

      <ul className="divide-y divide-border">
        {order.items.map((item) => (
          <li
            key={`${order.orderId}-${item.name}`}
            className="grid grid-cols-[1fr_auto] gap-4 py-3 text-sm"
          >
            <span className="text-muted-foreground">
              <span className="text-foreground">{item.quantity} ×</span>{" "}
              {item.name}
            </span>
            <span className="font-mono">{formatKr(item.subtotalKr)}</span>
          </li>
        ))}
      </ul>

      <div className="mt-4 space-y-2 border-t border-border pt-4 font-mono text-sm">
        <SummaryLine label="Kaffe" value={formatKr(order.coffeeSubtotalKr)} />
        <SummaryLine label="Frakt" value={formatKr(order.shippingShareKr)} />
        <SummaryLine label="Totalt" value={formatKr(order.totalKr)} strong />
      </div>

      <OrderPaymentSection order={order} />

      {order.roundStatus === "ready" ? (
        <OrderPickupSection order={order} slots={pickupSlots} />
      ) : null}
    </div>
  )
}

function SummaryLine({
  label,
  value,
  strong = false,
}: {
  label: string
  value: string
  strong?: boolean
}) {
  return (
    <p
      className={`flex items-center justify-between gap-4 ${strong ? "text-base font-semibold text-foreground" : "text-muted-foreground"}`}
    >
      <span>{label}</span>
      <span>{value}</span>
    </p>
  )
}

function formatDate(value: Date | string) {
  return new Intl.DateTimeFormat("nb-NO", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value))
}

function MissingOrder() {
  return (
    <p className="mt-8 rounded-lg border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
      Fant ikke bestillingen.
    </p>
  )
}
