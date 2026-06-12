import { createFileRoute, redirect, useRouter } from "@tanstack/react-router"
import { useMemo, useState } from "react"
import { BRAND_NAME } from "@/components/brand"
import { LogisticsFooter } from "@/components/logistics-footer"
import { Button } from "@/components/ui/button"
import { getCustomerLoginRedirect } from "@/lib/customer-route-guard"
import { formatKr } from "@/lib/money"
import {
  calculateOrderLeaderboard,
  getCustomerOrderStatus,
} from "@/lib/order-totals"
import { addCoffeeVat, calculateCoffeeVat } from "@/lib/vat"
import { getCustomerRouteAccess } from "@/server/customer-access"
import { logout } from "@/server/login.functions"
import { getCustomerHomeData, submitOrder } from "@/server/coffee"

export const Route = createFileRoute("/")({
  loader: async ({ location }) => {
    const access = await getCustomerRouteAccess()
    const loginRedirect = getCustomerLoginRedirect({
      authenticated: access.authenticated,
      currentPath: location.href,
    })
    if (loginRedirect) throw redirect(loginRedirect)

    return getCustomerHomeData()
  },
  component: CustomerPage,
})

function CustomerPage() {
  const data = Route.useLoaderData()
  const router = useRouter()

  if (!data.unlocked) return null

  return (
    <main className="min-h-svh px-4 py-5 text-foreground sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-5">
        <AppHeader
          title={BRAND_NAME}
          selectedCustomer={data.selectedCustomer}
          onLogout={async () => {
            await logout()
            await router.invalidate()
          }}
        />

        {data.selectedCustomer && !data.openRound ? (
          data.statusOrder ? (
            <CustomerStatusPanel order={data.statusOrder} />
          ) : (
            <EmptyState />
          )
        ) : null}
        {data.selectedCustomer && data.openRound ? (
          <OrderForm
            openRound={data.openRound}
            selectedCustomer={data.selectedCustomer}
          />
        ) : null}
        <LogisticsFooter customers={data.customers} />
      </div>
    </main>
  )
}

type CustomerData = Extract<
  Awaited<ReturnType<typeof getCustomerHomeData>>,
  { unlocked: true }
>

function AppHeader({
  title,
  selectedCustomer,
  onLogout,
}: {
  title: string
  selectedCustomer?: CustomerData["selectedCustomer"]
  onLogout?: () => Promise<void>
}) {
  return (
    <header className="flex items-center justify-between gap-4 border-b border-(--ledger-line) py-4">
      <div className="flex items-center gap-3">
        <h1 className="font-serif text-3xl font-normal tracking-tight sm:text-4xl">
          {title}
        </h1>
      </div>
      {selectedCustomer ? (
        <div className="flex items-center gap-3 text-right">
          <div className="hidden sm:block">
            <p className="text-sm font-medium">{selectedCustomer.name}</p>
            <p className="font-mono text-xs text-muted-foreground">
              {selectedCustomer.email}
            </p>
          </div>
          <Button variant="outline" size="sm" type="button" onClick={onLogout}>
            Logg ut
          </Button>
        </div>
      ) : null}
    </header>
  )
}

function EmptyState() {
  return (
    <section className="rounded-lg border border-(--ledger-line) bg-card p-6">
      <p className="font-mono text-xs tracking-[0.18em] text-muted-foreground uppercase">
        STATUS
      </p>
      <h2 className="mt-3 text-3xl tracking-tight">
        Ingen bestilling akkurat nå
      </h2>
      <p className="mt-2 max-w-prose text-sm text-muted-foreground">
        Ny runde vises her når den åpner.
      </p>
    </section>
  )
}

type StatusOrder = NonNullable<CustomerData["statusOrder"]>

function CustomerStatusPanel({ order }: { order: StatusOrder }) {
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

type OpenRound = NonNullable<
  Extract<
    Awaited<ReturnType<typeof getCustomerHomeData>>,
    { unlocked: true }
  >["openRound"]
>

function OrderForm({
  openRound,
  selectedCustomer,
}: {
  openRound: OpenRound
  selectedCustomer: NonNullable<CustomerData["selectedCustomer"]>
}) {
  const router = useRouter()
  const [quantities, setQuantities] = useState<Record<string, number>>({})
  const [error, setError] = useState("")
  const [confirmation, setConfirmation] = useState<{
    bagCount: number
    subtotalKr: number
  } | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const bagCount = Object.values(quantities).reduce(
    (sum, quantity) => sum + quantity,
    0
  )
  const subtotalKr = useMemo(
    () =>
      openRound.coffees.reduce(
        (sum, coffee) =>
          sum + addCoffeeVat((quantities[coffee.id] ?? 0) * coffee.priceKr),
        0
      ),
    [openRound.coffees, quantities]
  )
  const vatKr = useMemo(
    () =>
      openRound.coffees.reduce(
        (sum, coffee) =>
          sum +
          calculateCoffeeVat((quantities[coffee.id] ?? 0) * coffee.priceKr),
        0
      ),
    [openRound.coffees, quantities]
  )

  function setQuantity(id: string, quantity: number) {
    setQuantities((current) => ({ ...current, [id]: Math.max(0, quantity) }))
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError("")
    setConfirmation(null)
    setIsSubmitting(true)
    try {
      await submitOrder({
        data: {
          roundId: openRound.id,
          items: openRound.coffees.map((coffee) => ({
            roundCoffeeId: coffee.id,
            quantity: quantities[coffee.id] ?? 0,
          })),
        },
      })
      setConfirmation({ bagCount, subtotalKr })
      setQuantities({})
      await router.invalidate()
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Kunne ikke sende bestilling"
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="grid gap-5 lg:grid-cols-[1fr_18rem] lg:items-start"
    >
      <section className="rounded-lg border border-[var(--ledger-line)] bg-card">
        <div className="border-b border-border p-4 sm:p-5">
          <p className="font-mono text-xs tracking-[0.18em] text-muted-foreground uppercase">
            BESTILLING ÅPEN
          </p>
          <h2 className="mt-2 font-serif text-3xl font-normal tracking-tight">
            {openRound.supplier.name}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Frakt deles likt mellom alle som bestiller.
          </p>
          {openRound.closesAt ? (
            <p className="mt-3 inline-flex rounded-md border border-border bg-muted/30 px-2.5 py-1 font-mono text-xs text-muted-foreground">
              {formatClosingText(openRound.closesAt)}
            </p>
          ) : null}
        </div>

        <div className="divide-y divide-border">
          {openRound.coffees.map((coffee) => {
            const quantity = quantities[coffee.id] ?? 0
            return (
              <div
                key={coffee.id}
                className="grid gap-3 p-4 sm:grid-cols-[1fr_auto] sm:items-center sm:p-5"
              >
                <div className="flex min-w-0 items-center gap-3">
                  {coffee.imageUrl ? (
                    <img
                      className="size-14 shrink-0 rounded-md object-cover"
                      src={coffee.imageUrl}
                      alt={coffee.name}
                      loading="lazy"
                    />
                  ) : (
                    <div className="size-14 rounded-md border border-border bg-muted" />
                  )}
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-semibold">
                      {coffee.name}
                    </h3>
                    {coffee.description ? (
                      <p className="mt-1 text-sm text-muted-foreground">
                        {coffee.description}
                      </p>
                    ) : null}
                    <p className="mt-1 font-mono text-sm">
                      {formatKr(addCoffeeVat(coffee.priceKr))}
                    </p>
                  </div>
                </div>
                <div className="inline-grid grid-cols-[2.25rem_2.5rem_2.25rem] justify-self-start overflow-hidden rounded-lg border border-border sm:justify-self-end">
                  <button
                    className="h-9 bg-card text-lg hover:bg-muted"
                    type="button"
                    onClick={() => setQuantity(coffee.id, quantity - 1)}
                    aria-label={`Fjern ${coffee.name}`}
                  >
                    −
                  </button>
                  <span className="grid h-9 place-items-center border-x border-border font-mono text-sm font-semibold">
                    {quantity}
                  </span>
                  <button
                    className="h-9 bg-card text-lg hover:bg-muted"
                    type="button"
                    onClick={() => setQuantity(coffee.id, quantity + 1)}
                    aria-label={`Legg til ${coffee.name}`}
                  >
                    +
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      <aside className="space-y-5 lg:sticky lg:top-5">
        <section className="rounded-lg border border-[var(--ledger-line)] bg-card p-4 shadow-sm">
          {confirmation ? (
            <div>
              <p className="font-mono text-xs tracking-[0.18em] text-[var(--ledger-success)] uppercase">
                ✓ SENDT
              </p>
              <h3 className="mt-2 text-xl">Bestilling sendt</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {confirmation.bagCount} poser. Kaffe{" "}
                {formatKr(confirmation.subtotalKr)}. Frakt kommer senere.
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Send melding til Kristoffer hvis noe må endres.
              </p>
              <Button
                className="mt-5 w-full"
                type="button"
                onClick={() => setConfirmation(null)}
              >
                Bestill mer
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 border-b border-border pb-4">
                <SummaryCell label="Poser" value={bagCount} />
                <div>
                  <SummaryCell label="Sum" value={formatKr(subtotalKr)} />
                  <p className="mt-1 font-mono text-xs text-muted-foreground">
                    Mva (15%): {formatKr(vatKr)}
                  </p>
                </div>
              </div>
              <div className="rounded-md border border-border bg-muted/30 p-3">
                <p className="font-mono text-[0.65rem] tracking-[0.16em] text-muted-foreground uppercase">
                  Bestiller som
                </p>
                <p className="mt-1 font-medium">{selectedCustomer.name}</p>
                <p className="font-mono text-xs text-muted-foreground">
                  {selectedCustomer.email} · {selectedCustomer.phone}
                </p>
              </div>
              {error ? (
                <p className="text-sm text-destructive">{error}</p>
              ) : null}
              <Button
                className="w-full"
                size="lg"
                type="submit"
                disabled={isSubmitting || bagCount === 0}
              >
                {isSubmitting ? "Sender" : "Send bestilling"}
              </Button>
            </div>
          )}
        </section>
        <OrderLeaderboard orders={openRound.orders} />
      </aside>
    </form>
  )
}

function formatClosingText(value: Date | string) {
  const closesAt = new Date(value)
  const milliseconds = closesAt.getTime() - Date.now()

  if (!Number.isFinite(milliseconds)) return "Stenger snart"
  if (milliseconds <= 0) return "Stenger nå"

  const totalHours = Math.ceil(milliseconds / (1000 * 60 * 60))
  const days = Math.floor(totalHours / 24)
  const hours = totalHours % 24
  const parts: Array<string> = []

  if (days > 0) parts.push(`${days} ${days === 1 ? "dag" : "dager"}`)
  if (hours > 0) parts.push(`${hours} ${hours === 1 ? "time" : "timer"}`)

  return `Stenger om ${parts.join(" og ")}`
}

function OrderLeaderboard({ orders }: { orders: OpenRound["orders"] }) {
  const [expanded, setExpanded] = useState(false)
  const entries = useMemo(() => calculateOrderLeaderboard(orders), [orders])
  if (entries.length === 0) return null

  const totalBags = entries.reduce((sum, entry) => sum + entry.bagCount, 0)
  const totalKr = entries.reduce((sum, entry) => sum + entry.totalKr, 0)

  return (
    <section className="overflow-hidden rounded-lg border border-[var(--ledger-line)] bg-card shadow-sm">
      <button
        className="grid w-full gap-3 p-4 text-left hover:bg-muted/50"
        type="button"
        onClick={() => setExpanded((value) => !value)}
        aria-expanded={expanded}
      >
        <span>
          <span className="font-mono text-xs tracking-[0.18em] text-muted-foreground uppercase">
            TOPPLISTE
          </span>
          <span className="mt-1 block text-sm font-semibold">
            {entries.length} bestillinger, {totalBags} poser,{" "}
            {formatKr(totalKr)}
          </span>
        </span>
        <span className="justify-self-start rounded-md border border-border px-2 py-1 font-mono text-xs text-muted-foreground">
          {expanded ? "Skjul" : "Vis liste"}
        </span>
      </button>

      {expanded ? (
        <ol className="divide-y divide-border border-t border-border">
          {entries.map((entry, index) => (
            <li key={entry.orderId} className="p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span
                    className={`grid size-10 shrink-0 place-items-center rounded-md border font-mono text-xs font-semibold ${avatarClassName(index)}`}
                    aria-hidden="true"
                  >
                    {getInitials(entry.customerName)}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">
                      {entry.customerName}
                    </p>
                    <p className="font-mono text-xs text-muted-foreground">
                      #{index + 1}
                    </p>
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-mono text-sm font-semibold">
                    {entry.bagCount} poser
                  </p>
                  <p className="font-mono text-sm text-muted-foreground">
                    {formatKr(entry.totalKr)}
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ol>
      ) : null}
    </section>
  )
}

function avatarClassName(index: number) {
  if (index === 0) return "border-amber-300 bg-amber-100 text-amber-900"
  if (index === 1) return "border-slate-300 bg-slate-100 text-slate-800"
  if (index === 2) return "border-orange-300 bg-orange-100 text-orange-900"
  return "border-border bg-card text-muted-foreground"
}

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toLocaleUpperCase("nb-NO"))
    .join("")
}

function SummaryCell({
  label,
  value,
}: {
  label: string
  value: React.ReactNode
}) {
  return (
    <div>
      <p className="font-mono text-[0.65rem] tracking-[0.16em] text-muted-foreground uppercase">
        {label}
      </p>
      <p className="mt-1 font-mono text-lg font-semibold">{value}</p>
    </div>
  )
}
