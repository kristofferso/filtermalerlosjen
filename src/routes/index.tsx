import { createFileRoute, useRouter } from "@tanstack/react-router"
import { useMemo, useState } from "react"
import { formatKr } from "@/lib/money"
import { getCustomerHomeData, submitOrder } from "@/server/coffee"
import { unlockCustomer } from "@/server/auth"

export const Route = createFileRoute("/")({
  loader: () => getCustomerHomeData(),
  component: CustomerPage,
})

function CustomerPage() {
  const data = Route.useLoaderData()
  const router = useRouter()

  return (
    <main className="min-h-svh bg-gradient-to-br from-stone-100 via-amber-50 to-stone-200 px-4 py-6 text-stone-950 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <header className="space-y-2 pt-4">
        <p className="text-sm uppercase tracking-[0.2em] text-stone-500">Private coffee orders</p>
        <h1 className="text-3xl font-semibold tracking-tight">Kaffekollektivet</h1>
      </header>

      {!data.unlocked ? <PasswordForm onUnlocked={() => router.invalidate()} /> : null}
      {data.unlocked && !data.openRound ? <p className="rounded-2xl bg-white p-5 shadow-sm">No coffee order is open right now.</p> : null}
      {data.unlocked && data.openRound ? <OrderForm openRound={data.openRound} /> : null}
      </div>
    </main>
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
    <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl bg-white p-5 shadow-sm">
      <label className="block space-y-2">
        <span className="text-sm font-medium">Coffee password</span>
        <input
          className="w-full rounded-xl border border-stone-300 px-4 py-3 text-base"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
      </label>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      <button className="w-full rounded-xl bg-stone-950 px-4 py-3 font-medium text-white" disabled={isSubmitting}>
        {isSubmitting ? "Unlocking…" : "Unlock"}
      </button>
    </form>
  )
}

type OpenRound = NonNullable<Extract<Awaited<ReturnType<typeof getCustomerHomeData>>, { unlocked: true }>['openRound']>

function OrderForm({ openRound }: { openRound: OpenRound }) {
  const [quantities, setQuantities] = useState<Record<string, number>>({})
  const [customerName, setCustomerName] = useState("")
  const [error, setError] = useState("")
  const [confirmation, setConfirmation] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const bagCount = Object.values(quantities).reduce((sum, quantity) => sum + quantity, 0)
  const subtotalKr = useMemo(
    () => openRound.coffees.reduce((sum, coffee) => sum + (quantities[coffee.id] ?? 0) * coffee.priceKr, 0),
    [openRound.coffees, quantities],
  )

  function setQuantity(id: string, quantity: number) {
    setQuantities((current) => ({ ...current, [id]: Math.max(0, quantity) }))
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError("")
    setConfirmation("")
    setIsSubmitting(true)
    try {
      await submitOrder({
        data: {
          roundId: openRound.id,
          customerName,
          items: openRound.coffees.map((coffee) => ({ roundCoffeeId: coffee.id, quantity: quantities[coffee.id] ?? 0 })),
        },
      })
      setConfirmation(`${bagCount} bags submitted. Coffee subtotal: ${formatKr(subtotalKr)}. Message Kristoffer if anything needs changing.`)
      setQuantities({})
      setCustomerName("")
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not submit order")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-4">
      <section className="rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="text-xl font-semibold">{openRound.supplier.name} order is open</h2>
        <p className="mt-2 text-sm text-stone-600">Shipping, if any, will be added evenly across everyone who ordered.</p>
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        {openRound.coffees.map((coffee) => {
          const quantity = quantities[coffee.id] ?? 0
          return (
            <div key={coffee.id} className="flex items-center justify-between gap-3 rounded-2xl bg-white p-4 shadow-sm">
              <div className="flex min-w-0 items-center gap-3">
                {coffee.imageUrl ? <img className="h-16 w-16 shrink-0 rounded-xl object-cover" src={coffee.imageUrl} alt={coffee.name} loading="lazy" /> : null}
                <div className="min-w-0">
                  <h3 className="truncate font-medium">{coffee.name}</h3>
                  <p className="text-sm text-stone-600">{formatKr(coffee.priceKr)}</p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <button className="h-10 w-10 rounded-full bg-stone-200 text-xl" type="button" onClick={() => setQuantity(coffee.id, quantity - 1)}>
                  −
                </button>
                <span className="w-6 text-center font-medium">{quantity}</span>
                <button className="h-10 w-10 rounded-full bg-stone-950 text-xl text-white" type="button" onClick={() => setQuantity(coffee.id, quantity + 1)}>
                  +
                </button>
              </div>
            </div>
          )
        })}
      </section>

      <section className="sticky bottom-4 mt-auto space-y-4 rounded-2xl bg-white p-5 shadow-lg ring-1 ring-stone-200">
        <div className="flex items-center justify-between font-medium">
          <span>{bagCount} bags</span>
          <span>{formatKr(subtotalKr)}</span>
        </div>
        <label className="block space-y-2">
          <span className="text-sm font-medium">Name</span>
          <input className="w-full rounded-xl border border-stone-300 px-4 py-3 text-base" value={customerName} onChange={(event) => setCustomerName(event.target.value)} />
        </label>
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
        {confirmation ? <p className="text-sm text-green-700">{confirmation}</p> : null}
        <button className="w-full rounded-xl bg-stone-950 px-4 py-3 font-medium text-white disabled:opacity-50" disabled={isSubmitting || bagCount === 0 || !customerName.trim()}>
          {isSubmitting ? "Submitting…" : "Submit order"}
        </button>
      </section>
    </form>
  )
}
