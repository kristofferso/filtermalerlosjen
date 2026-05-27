import { createFileRoute } from "@tanstack/react-router"
import { BRAND_NAME } from "@/components/brand"
import { OrderStatusStepper } from "@/components/order-status-stepper"
import { buttonVariants } from "@/components/ui/button"
import { formatKr } from "@/lib/money"
import { getCustomerOrderStatus } from "@/lib/order-totals"
import { getPaymentOrderData } from "@/server/coffee"

export const Route = createFileRoute("/bestilling/$orderId")({
  loader: ({ params }) =>
    getPaymentOrderData({ data: { orderId: params.orderId } }),
  component: PaymentPage,
})

function PaymentPage() {
  const order = Route.useLoaderData()

  return (
    <main className="min-h-svh text-foreground">
      <section
        className="relative flex min-h-svh w-full flex-col items-center justify-center overflow-hidden bg-cover bg-center px-4 py-10"
        style={{
          backgroundImage:
            "linear-gradient(to bottom, transparent 55%, rgb(0 0 0 / 0.3) 100%), url('/bg.png')",
        }}
      >
        <div className="relative z-10 w-full max-w-lg rounded-2xl border border-border bg-card/95 p-6 text-card-foreground shadow-2xl shadow-black/20 sm:p-8">
          <div className="text-center">
            <p className="font-mono text-[0.7rem] tracking-[0.22em] text-muted-foreground uppercase">
              {BRAND_NAME}
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

          {!order ? <MissingOrder /> : <PaymentCard order={order} />}
        </div>

        <img
          src="/filtermalerlosjen-logo.png"
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute bottom-5 left-1/2 h-9 w-auto -translate-x-1/2 opacity-55 brightness-0 invert sm:bottom-6 sm:h-10"
          loading="eager"
        />
      </section>
    </main>
  )
}

type PaymentOrder = NonNullable<Awaited<ReturnType<typeof getPaymentOrderData>>>

function PaymentCard({ order }: { order: PaymentOrder }) {
  return (
    <div className="mt-8">
      <div className="flex items-baseline justify-between gap-4 border-b border-border pb-4">
        <div>
          <p className="text-sm text-muted-foreground">Bestilling</p>
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

      <div className="mt-6 border-t border-border pt-6">
        {order.paid ? null : order.vippsUrl ? (
          <a
            className={buttonVariants({ className: "w-full", size: "lg" })}
            href={order.vippsUrl}
          >
            Betal med Vipps
          </a>
        ) : (
          <p className="rounded-lg border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
            Betaling er ikke konfigurert ennå.
          </p>
        )}
      </div>
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
