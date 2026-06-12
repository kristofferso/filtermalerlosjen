import type { getCustomerHomeData } from "@/server/coffee"
import { formatKr } from "@/lib/money"
import { getCustomerOrderStatus } from "@/lib/order-totals"

type CustomerData = Extract<
  Awaited<ReturnType<typeof getCustomerHomeData>>,
  { unlocked: true }
>
type StatusOrder = NonNullable<CustomerData["statusOrder"]>

export function CustomerStatusPanel({ order }: { order: StatusOrder }) {
  const statusText = getCustomerOrderStatus({
    roundStatus: order.roundStatus,
    paid: order.paid,
    collected: order.collected,
  })

  return (
    <section className="">
      <p className="font-mono text-xs tracking-[0.18em] text-muted-foreground uppercase">
        Dine ordre
      </p>
      <a
        className="mt-3 grid gap-4 rounded-lg border border-border bg-muted/25 p-4 text-left hover:bg-muted/40 sm:grid-cols-[1fr_auto] sm:items-center"
        href={`/bestilling/${order.orderId}`}
      >
        <span>
          <span className="block font-serif text-3xl font-normal tracking-tight">
            {statusText}
          </span>
          <span className="mt-2 block text-sm text-muted-foreground">
            {order.supplier.name}. Bestilling #{order.orderId.slice(0, 8)}.
          </span>
          <span className="mt-3 block font-mono text-sm text-muted-foreground">
            {order.bagCount} poser · {formatKr(order.totalKr)}
          </span>
        </span>
        <span className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground">
          Se bestilling
        </span>
      </a>
    </section>
  )
}
