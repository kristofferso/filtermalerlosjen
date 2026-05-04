import { createFileRoute, useRouter } from "@tanstack/react-router"
import { useMemo, useState } from "react"
import { formatKr, parseKroner } from "@/lib/money"
import { calculateRoundTotals } from "@/lib/order-totals"
import { unlockAdmin } from "@/server/auth"
import {
  addCoffee,
  closeRound,
  deleteOrder,
  getAdminDashboard,
  openRound,
  updateCoffee,
  updateOrderFlags,
} from "@/server/coffee"

export const Route = createFileRoute("/admin")({
  loader: () => getAdminDashboard(),
  component: AdminPage,
})

type Dashboard = Extract<Awaited<ReturnType<typeof getAdminDashboard>>, { unlocked: true }>
type Coffee = Dashboard["coffees"][number]
type Supplier = Dashboard["suppliers"][number]
type Round = NonNullable<Dashboard["openRound"]> | Dashboard["closedRounds"][number]

function AdminPage() {
  const data = Route.useLoaderData()
  const router = useRouter()

  return (
    <main className="mx-auto min-h-svh w-full max-w-4xl space-y-6 bg-stone-50 p-4 text-stone-950 sm:p-6">
      <header className="space-y-1 pt-4">
        <p className="text-sm uppercase tracking-[0.2em] text-stone-500">Kaffekollektivet</p>
        <h1 className="text-3xl font-semibold tracking-tight">Order Desk</h1>
      </header>

      {!data.unlocked ? <AdminPasswordForm onUnlocked={() => router.invalidate()} /> : null}
      {data.unlocked ? <DashboardView dashboard={data} refresh={() => router.invalidate()} /> : null}
    </main>
  )
}

function AdminPasswordForm({ onUnlocked }: { onUnlocked: () => Promise<void> }) {
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError("")
    const result = await unlockAdmin({ data: { password } })
    if (!result.ok) {
      setError(result.error)
      return
    }
    await onUnlocked()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl bg-white p-5 shadow-sm">
      <label className="block space-y-2">
        <span className="text-sm font-medium">Admin password</span>
        <input className="w-full rounded-xl border border-stone-300 px-4 py-3 text-base" type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
      </label>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      <button className="rounded-xl bg-stone-950 px-4 py-3 font-medium text-white">Unlock admin</button>
    </form>
  )
}

function DashboardView({ dashboard, refresh }: { dashboard: Dashboard; refresh: () => Promise<void> }) {
  return (
    <div className="space-y-6">
      {dashboard.openRound ? (
        <OpenRoundSection round={dashboard.openRound} refresh={refresh} />
      ) : (
        <CatalogSection dashboard={dashboard} refresh={refresh} />
      )}
      <HistorySection rounds={dashboard.closedRounds} refresh={refresh} />
    </div>
  )
}

function CatalogSection({ dashboard, refresh }: { dashboard: Dashboard; refresh: () => Promise<void> }) {
  const [supplierId, setSupplierId] = useState(dashboard.suppliers[0]?.id ?? "")
  const [showInactive, setShowInactive] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Array<string>>([])
  const selectedSupplier = dashboard.suppliers.find((supplier) => supplier.id === supplierId) ?? dashboard.suppliers[0]
  const supplierCoffees = dashboard.coffees.filter((coffee) => coffee.supplierId === selectedSupplier?.id)
  const visibleCoffees = supplierCoffees.filter((coffee) => showInactive || coffee.isActive)
  const lastPrice = supplierCoffees[0]?.priceKr ?? 139

  function toggleCoffee(id: string) {
    setSelectedIds((current) => (current.includes(id) ? current.filter((selectedId) => selectedId !== id) : [...current, id]))
  }

  async function handleOpenRound() {
    if (!selectedSupplier) return
    await openRound({ data: { supplierId: selectedSupplier.id, coffeeIds: selectedIds } })
    await refresh()
  }

  return (
    <section className="space-y-4 rounded-2xl bg-white p-5 shadow-sm">
      <div>
        <h2 className="text-xl font-semibold">Open next round</h2>
        <p className="text-sm text-stone-600">Choose one supplier and tap rows to include coffees.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {dashboard.suppliers.map((supplier) => (
          <button
            key={supplier.id}
            className={`rounded-full px-4 py-2 text-sm font-medium ${supplier.id === selectedSupplier?.id ? "bg-stone-950 text-white" : "bg-stone-100"}`}
            type="button"
            onClick={() => {
              setSupplierId(supplier.id)
              setSelectedIds([])
            }}
          >
            {supplier.name}
          </button>
        ))}
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={showInactive} onChange={(event) => setShowInactive(event.target.checked)} />
        Show inactive
      </label>

      <div className="divide-y divide-stone-200 rounded-2xl border border-stone-200">
        {visibleCoffees.map((coffee) => (
          <CoffeeRow key={coffee.id} coffee={coffee} selected={selectedIds.includes(coffee.id)} onToggle={() => toggleCoffee(coffee.id)} refresh={refresh} />
        ))}
        {visibleCoffees.length === 0 ? <p className="p-4 text-sm text-stone-600">No coffees yet.</p> : null}
      </div>

      {selectedSupplier ? <AddCoffeeForm supplier={selectedSupplier} defaultPriceKr={lastPrice} onAdded={(coffee) => setSelectedIds((current) => [...current, coffee.id])} refresh={refresh} /> : null}

      <button className="w-full rounded-xl bg-stone-950 px-4 py-3 font-medium text-white disabled:opacity-50" disabled={!selectedSupplier || selectedIds.length === 0} onClick={handleOpenRound} type="button">
        Open round with {selectedIds.length} coffees
      </button>
    </section>
  )
}

function CoffeeRow({ coffee, selected, onToggle, refresh }: { coffee: Coffee; selected: boolean; onToggle: () => void; refresh: () => Promise<void> }) {
  const [isEditing, setIsEditing] = useState(false)

  return (
    <div className="p-4">
      <button className="flex w-full items-center justify-between gap-3 text-left" type="button" onClick={onToggle}>
        <span>
          <span className="font-medium">{coffee.name}</span>
          {!coffee.isActive ? <span className="ml-2 rounded bg-stone-200 px-2 py-0.5 text-xs">Inactive</span> : null}
          <span className="block text-sm text-stone-600">{formatKr(coffee.priceKr)} {coffee.description ? `· ${coffee.description}` : ""}</span>
        </span>
        <span className={`rounded-full px-3 py-1 text-sm ${selected ? "bg-green-700 text-white" : "bg-stone-100"}`}>{selected ? "Selected" : "Add"}</span>
      </button>
      <button className="mt-2 text-sm underline" type="button" onClick={() => setIsEditing((value) => !value)}>Edit</button>
      {isEditing ? <EditCoffeeForm coffee={coffee} refresh={refresh} /> : null}
    </div>
  )
}

function AddCoffeeForm({ supplier, defaultPriceKr, onAdded, refresh }: { supplier: Supplier; defaultPriceKr: number; onAdded: (coffee: Coffee) => void; refresh: () => Promise<void> }) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [price, setPrice] = useState(String(defaultPriceKr))

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const coffee = await addCoffee({ data: { supplierId: supplier.id, name, description, priceKr: parseKroner(price) } })
    onAdded(coffee)
    setName("")
    setDescription("")
    setPrice(String(coffee.priceKr))
    await refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-3 rounded-2xl bg-stone-100 p-4 sm:grid-cols-[1fr_1fr_8rem_auto]">
      <input className="rounded-xl border border-stone-300 px-3 py-2" placeholder="Coffee name" value={name} onChange={(event) => setName(event.target.value)} />
      <input className="rounded-xl border border-stone-300 px-3 py-2" placeholder="Description" value={description} onChange={(event) => setDescription(event.target.value)} />
      <input className="rounded-xl border border-stone-300 px-3 py-2" inputMode="numeric" pattern="\d*" value={price} onChange={(event) => setPrice(event.target.value.replace(/\D/g, ""))} />
      <button className="rounded-xl bg-stone-950 px-4 py-2 font-medium text-white">Add</button>
    </form>
  )
}

function EditCoffeeForm({ coffee, refresh }: { coffee: Coffee; refresh: () => Promise<void> }) {
  const [name, setName] = useState(coffee.name)
  const [description, setDescription] = useState(coffee.description)
  const [price, setPrice] = useState(String(coffee.priceKr))
  const [isActive, setIsActive] = useState(coffee.isActive)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    await updateCoffee({ data: { id: coffee.id, supplierId: coffee.supplierId, name, description, priceKr: parseKroner(price), isActive } })
    await refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 grid gap-2 rounded-xl bg-stone-100 p-3 sm:grid-cols-[1fr_1fr_7rem_auto_auto]">
      <input className="rounded-lg border border-stone-300 px-3 py-2" value={name} onChange={(event) => setName(event.target.value)} />
      <input className="rounded-lg border border-stone-300 px-3 py-2" value={description} onChange={(event) => setDescription(event.target.value)} />
      <input className="rounded-lg border border-stone-300 px-3 py-2" inputMode="numeric" pattern="\d*" value={price} onChange={(event) => setPrice(event.target.value.replace(/\D/g, ""))} />
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={isActive} onChange={(event) => setIsActive(event.target.checked)} /> Active</label>
      <button className="rounded-lg bg-stone-950 px-3 py-2 text-white">Save</button>
    </form>
  )
}

function OpenRoundSection({ round, refresh }: { round: NonNullable<Dashboard["openRound"]>; refresh: () => Promise<void> }) {
  const [shipping, setShipping] = useState("0")

  async function handleClose() {
    await closeRound({ data: { roundId: round.id, shippingKr: parseKroner(shipping) } })
    await refresh()
  }

  return (
    <section className="space-y-4 rounded-2xl bg-white p-5 shadow-sm">
      <div>
        <h2 className="text-xl font-semibold">Open round · {round.supplier?.name}</h2>
        <p className="text-sm text-stone-600">Supplier is locked while this round is open.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {round.coffees.map((coffee) => <span key={coffee.id} className="rounded-full bg-stone-100 px-3 py-1 text-sm">{coffee.nameSnapshot} · {formatKr(coffee.priceKrSnapshot)}</span>)}
      </div>
      <OrderList orders={round.orders} refresh={refresh} />
      <div className="flex flex-col gap-3 rounded-2xl bg-stone-100 p-4 sm:flex-row sm:items-end">
        <label className="flex-1 space-y-1">
          <span className="text-sm font-medium">Shipping in kroner</span>
          <input className="w-full rounded-xl border border-stone-300 px-3 py-2" inputMode="numeric" pattern="\d*" value={shipping} onChange={(event) => setShipping(event.target.value.replace(/\D/g, ""))} />
        </label>
        <button className="rounded-xl bg-stone-950 px-4 py-3 font-medium text-white" type="button" onClick={handleClose}>Close round</button>
      </div>
    </section>
  )
}

function OrderList({ orders, refresh }: { orders: Round["orders"]; refresh: () => Promise<void> }) {
  if (orders.length === 0) return <p className="rounded-2xl bg-stone-100 p-4 text-sm text-stone-600">No orders yet.</p>

  return (
    <div className="space-y-3">
      {orders.map((order) => (
        <article key={order.id} className="rounded-2xl border border-stone-200 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-semibold">{order.customerName}</h3>
              <p className="text-sm text-stone-600">{order.items.reduce((sum, item) => sum + item.quantity, 0)} bags</p>
            </div>
            <button className="text-sm text-red-700 underline" type="button" onClick={async () => { await deleteOrder({ data: { orderId: order.id } }); await refresh() }}>Delete</button>
          </div>
          <ul className="mt-3 space-y-1 text-sm">
            {order.items.map((item) => <li key={`${order.id}-${item.name}`}>{item.quantity} × {item.name} · {formatKr(item.priceKr)}</li>)}
          </ul>
        </article>
      ))}
    </div>
  )
}

function HistorySection({ rounds, refresh }: { rounds: Dashboard["closedRounds"]; refresh: () => Promise<void> }) {
  const [selectedRoundId, setSelectedRoundId] = useState(rounds[0]?.id ?? "")
  const selectedRound = rounds.find((round) => round.id === selectedRoundId) ?? rounds[0]

  return (
    <section className="space-y-4 rounded-2xl bg-white p-5 shadow-sm">
      <h2 className="text-xl font-semibold">Closed rounds</h2>
      {rounds.length === 0 ? <p className="text-sm text-stone-600">No closed rounds yet.</p> : null}
      {rounds.length > 0 ? (
        <select className="w-full rounded-xl border border-stone-300 px-3 py-2" value={selectedRound?.id ?? ""} onChange={(event) => setSelectedRoundId(event.target.value)}>
          {rounds.map((round) => <option key={round.id} value={round.id}>{round.supplier?.name} · {formatDate(round.closedAt)}</option>)}
        </select>
      ) : null}
      {selectedRound ? <ClosedRoundSummary round={selectedRound} refresh={refresh} /> : null}
    </section>
  )
}

function ClosedRoundSummary({ round, refresh }: { round: Dashboard["closedRounds"][number]; refresh: () => Promise<void> }) {
  const totals = calculateRoundTotals({ shippingKr: round.shippingKr, orders: round.orders })
  const pickupRows = useMemo(() => round.orders.map((order) => ({ order, items: order.items.filter((item) => item.quantity > 0) })), [round.orders])

  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-stone-100 p-4 text-sm">
        <p><strong>{round.supplier?.name}</strong></p>
        <p>Opened: {formatDate(round.openedAt)} · Closed: {formatDate(round.closedAt)}</p>
        <p>Shipping: {formatKr(round.shippingKr)}</p>
      </div>

      <div className="space-y-3">
        {totals.map((total) => (
          <article key={total.orderId} className="rounded-2xl border border-stone-200 p-4">
            <h3 className="font-semibold">{total.customerName}</h3>
            <ul className="mt-2 space-y-1 text-sm">
              {total.items.map((item) => <li key={`${total.orderId}-${item.name}`}>{item.quantity} × {item.name}: {formatKr(item.subtotalKr)}</li>)}
            </ul>
            <div className="mt-3 grid gap-1 text-sm">
              <p>Coffee subtotal: {formatKr(total.coffeeSubtotalKr)}</p>
              <p>Shipping share: {formatKr(total.shippingShareKr)}</p>
              <p className="font-semibold">Total owed: {formatKr(total.totalKr)}</p>
            </div>
            <div className="mt-3 flex gap-4 text-sm">
              <FlagCheckbox label="Paid" checked={total.paid} onChange={async (checked) => { await updateOrderFlags({ data: { orderId: total.orderId, paid: checked, collected: total.collected } }); await refresh() }} />
              <FlagCheckbox label="Collected" checked={total.collected} onChange={async (checked) => { await updateOrderFlags({ data: { orderId: total.orderId, paid: total.paid, collected: checked } }); await refresh() }} />
            </div>
          </article>
        ))}
      </div>

      <div className="rounded-2xl bg-stone-100 p-4">
        <h3 className="font-semibold">Pickup list</h3>
        <ul className="mt-2 space-y-2 text-sm">
          {pickupRows.map(({ order, items }) => <li key={order.id}><strong>{order.customerName}:</strong> {items.map((item) => `${item.quantity} × ${item.name}`).join(", ")}</li>)}
        </ul>
      </div>
    </div>
  )
}

function FlagCheckbox({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => Promise<void> }) {
  return <label className="flex items-center gap-2"><input type="checkbox" checked={checked} onChange={(event) => void onChange(event.target.checked)} /> {label}</label>
}

function formatDate(value: Date | string | null) {
  if (!value) return "—"
  return new Intl.DateTimeFormat("nb-NO", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value))
}
