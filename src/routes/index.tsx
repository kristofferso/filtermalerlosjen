import { createFileRoute, useRouter } from "@tanstack/react-router"
import { useMemo, useState } from "react"
import { BRAND_NAME, FilterEngravedMark } from "@/components/brand"
import { Button } from "@/components/ui/button"
import { formatKr } from "@/lib/money"
import { getCustomerHomeData, submitOrder } from "@/server/coffee"
import { unlockCustomer } from "@/server/auth.functions"

export const Route = createFileRoute("/")({
  loader: () => getCustomerHomeData(),
  component: CustomerPage,
})

function CustomerPage() {
  const data = Route.useLoaderData()
  const router = useRouter()

  return (
    <main className="min-h-svh px-4 py-5 text-foreground sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-5">
        <AppHeader title={BRAND_NAME} />

        {!data.unlocked ? (
          <PasswordForm onUnlocked={() => router.invalidate()} />
        ) : null}
        {data.unlocked && !data.openRound ? <EmptyState /> : null}
        {data.unlocked && data.openRound ? (
          <OrderForm openRound={data.openRound} />
        ) : null}
      </div>
    </main>
  )
}

function AppHeader({ title }: { title: string }) {
  return (
    <header className="flex items-center border-b border-[var(--ledger-line)] py-4">
      <div className="flex items-center gap-3">
        <FilterEngravedMark />
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
          {title}
        </h1>
      </div>
    </header>
  )
}

function EmptyState() {
  return (
    <section className="rounded-lg border border-[var(--ledger-line)] bg-card p-6">
      <p className="font-mono text-xs tracking-[0.18em] text-muted-foreground uppercase">
        STATUS
      </p>
      <h2 className="mt-3 text-2xl font-semibold tracking-tight">
        Ingen bestilling akkurat nå
      </h2>
      <p className="mt-2 max-w-prose text-sm text-muted-foreground">
        Ny runde vises her når den åpner.
      </p>
    </section>
  )
}

function PasswordForm({ onUnlocked }: { onUnlocked: () => Promise<void> }) {
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSubmitting(true)
    setError("")
    const result = await unlockCustomer({ data: { password } })
    setIsSubmitting(false)
    if (!result.ok) {
      setError(result.error)
      return
    }
    await onUnlocked()
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border border-[var(--ledger-line)] bg-card p-5"
    >
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-xs tracking-[0.18em] text-muted-foreground uppercase">
            TILGANG
          </p>
          <h2 className="mt-2 text-lg font-semibold">Lås opp bestilling</h2>
        </div>
        <span className="rounded-md border border-border px-2 py-1 font-mono text-xs text-muted-foreground">
          PASSORD
        </span>
      </div>
      <label className="block space-y-2">
        <span className="text-sm font-medium">Kaffepassord</span>
        <input
          className="h-11 w-full rounded-md border border-input px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
      </label>
      {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
      <Button className="mt-5 w-full" size="lg" disabled={isSubmitting}>
        {isSubmitting ? "Låser opp" : "Lås opp"}
      </Button>
    </form>
  )
}

type OpenRound = NonNullable<
  Extract<
    Awaited<ReturnType<typeof getCustomerHomeData>>,
    { unlocked: true }
  >["openRound"]
>

function OrderForm({ openRound }: { openRound: OpenRound }) {
  const [quantities, setQuantities] = useState<Record<string, number>>({})
  const [customerName, setCustomerName] = useState("")
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
        (sum, coffee) => sum + (quantities[coffee.id] ?? 0) * coffee.priceKr,
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
          customerName,
          items: openRound.coffees.map((coffee) => ({
            roundCoffeeId: coffee.id,
            quantity: quantities[coffee.id] ?? 0,
          })),
        },
      })
      setConfirmation({ bagCount, subtotalKr })
      setQuantities({})
      setCustomerName("")
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
            BESTILLING AKTIV
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight">
            {openRound.supplier.name}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Evt. frakt deles likt mellom alle som bestiller.
          </p>
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
                      {formatKr(coffee.priceKr)}
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

      <section className="sticky bottom-4 rounded-lg border border-[var(--ledger-line)] bg-card p-4 shadow-sm lg:top-5">
        {confirmation ? (
          <div>
            <p className="font-mono text-xs tracking-[0.18em] text-[var(--ledger-success)] uppercase">
              ✓ SENDT
            </p>
            <h3 className="mt-2 text-lg font-semibold">Bestilling sendt</h3>
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
              <SummaryCell label="Sum" value={formatKr(subtotalKr)} />
            </div>
            <label className="block space-y-2">
              <span className="text-sm font-medium">Navn</span>
              <input
                className="h-10 w-full rounded-md border border-input px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30"
                value={customerName}
                onChange={(event) => setCustomerName(event.target.value)}
              />
            </label>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <Button
              className="w-full"
              size="lg"
              disabled={isSubmitting || bagCount === 0 || !customerName.trim()}
            >
              {isSubmitting ? "Sender" : "Send bestilling"}
            </Button>
          </div>
        )}
      </section>
    </form>
  )
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
