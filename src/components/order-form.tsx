import { useRouter } from "@tanstack/react-router"
import { useMemo, useState } from "react"
import type { getCustomerHomeData } from "@/server/coffee"
import { OrderLeaderboard } from "@/components/order-leaderboard"
import { Button } from "@/components/ui/button"
import { formatKr } from "@/lib/money"
import { addCoffeeVat, calculateCoffeeVat } from "@/lib/vat"
import { submitOrder } from "@/server/coffee"

type CustomerData = Extract<
  Awaited<ReturnType<typeof getCustomerHomeData>>,
  { unlocked: true }
>
type OpenRound = NonNullable<CustomerData["openRound"]>

export function OrderForm({
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
