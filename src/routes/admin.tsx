import { useState } from "react"
import { Check, Circle, Trash2 } from "lucide-react"
import { createFileRoute, useRouter } from "@tanstack/react-router"
import { BRAND_NAME } from "@/components/brand"
import { Button } from "@/components/ui/button"
import { formatKr, parseKroner } from "@/lib/money"
import {
  calculateCoffeeTotals,
  calculateRoundGrandTotals,
  calculateRoundTotals,
} from "@/lib/order-totals"
import { addCoffeeVat } from "@/lib/vat"
import { unlockAdmin } from "@/server/auth.functions"
import {
  addCoffee,
  archiveCoffee,
  closeRound,
  deleteOrder,
  getAdminDashboard,
  markRoundReadyForPickup,
  openRound,
  updateCoffee,
  updateOrderFlags,
  updateRoundClosesAt,
  updateRoundShipping,
} from "@/server/coffee"

export const Route = createFileRoute("/admin")({
  loader: () => getAdminDashboard(),
  component: AdminPage,
})

type Dashboard = Extract<
  Awaited<ReturnType<typeof getAdminDashboard>>,
  { unlocked: true }
>
type Coffee = Dashboard["coffees"][number]
type Supplier = Dashboard["suppliers"][number]
type Round =
  | NonNullable<Dashboard["openRound"]>
  | Dashboard["closedRounds"][number]

function AdminPage() {
  const data = Route.useLoaderData()
  const router = useRouter()

  return (
    <main className="min-h-svh px-4 py-5 text-foreground sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-7xl space-y-5">
        <AdminHeader />
        {!data.unlocked ? (
          <AdminPasswordForm onUnlocked={() => router.invalidate()} />
        ) : null}
        {data.unlocked ? (
          <DashboardView dashboard={data} refresh={() => router.invalidate()} />
        ) : null}
      </div>
    </main>
  )
}

function AdminHeader() {
  return (
    <header className="flex items-center justify-between border-b border-(--ledger-line) py-4">
      <div className="flex items-center gap-3">
        <div>
          <p className="font-mono text-[0.68rem] tracking-[0.22em] text-muted-foreground uppercase">
            ADMIN
          </p>
          <h1 className="font-serif text-2xl font-normal tracking-tight sm:text-3xl">
            {BRAND_NAME}
          </h1>
        </div>
      </div>
      <p className="hidden font-mono text-xs text-muted-foreground sm:block">
        Driftsprotokoll
      </p>
    </header>
  )
}

function AdminPasswordForm({
  onUnlocked,
}: {
  onUnlocked: () => Promise<void>
}) {
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
    <form
      onSubmit={handleSubmit}
      className="max-w-md rounded-lg border border-(--ledger-line) bg-card p-5"
    >
      <p className="font-mono text-xs tracking-[0.18em] text-muted-foreground uppercase">
        TILGANG
      </p>
      <h2 className="mt-2 text-xl">Lås opp admin</h2>
      <label className="mt-5 block space-y-2">
        <span className="text-sm font-medium">Adminpassord</span>
        <input
          className="h-10 w-full rounded-md border border-input px-3 outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? "admin-password-error" : undefined}
        />
      </label>
      {error ? (
        <p
          id="admin-password-error"
          className="mt-3 text-sm text-destructive"
          role="alert"
        >
          {error}
        </p>
      ) : null}
      <Button className="mt-5" type="submit">
        Lås opp
      </Button>
    </form>
  )
}

function DashboardView({
  dashboard,
  refresh,
}: {
  dashboard: Dashboard
  refresh: () => Promise<void>
}) {
  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start">
      <div className="space-y-5">
        {dashboard.openRound ? (
          <OpenRoundSection round={dashboard.openRound} refresh={refresh} />
        ) : (
          <CatalogSection dashboard={dashboard} refresh={refresh} />
        )}
        <HistorySection rounds={dashboard.closedRounds} refresh={refresh} />
        <CustomersSection customers={dashboard.customers} />
      </div>
      <StatusRail dashboard={dashboard} />
    </div>
  )
}

function StatusRail({ dashboard }: { dashboard: Dashboard }) {
  return (
    <aside className="space-y-3 lg:sticky lg:top-5">
      <CurrentRoundStats round={dashboard.openRound} />
      <LastRoundStats rounds={dashboard.closedRounds} />
    </aside>
  )
}

function CurrentRoundStats({ round }: { round: Dashboard["openRound"] }) {
  const orders = round?.orders ?? []
  const bagCount = countBags(orders)

  return (
    <section className="rounded-lg border border-(--ledger-line) bg-card p-4">
      <div className="flex items-center justify-between border-b border-border pb-3">
        <div>
          <p className="font-mono text-xs tracking-[0.18em] text-muted-foreground uppercase">
            NÅ
          </p>
          <h2 className="mt-1 text-lg">Aktiv runde</h2>
        </div>
        <StatusPill
          active={Boolean(round)}
          label={round ? "Aktiv" : "Stengt"}
        />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <RailMetric
          label="Leverandør"
          value={round?.supplier ? round.supplier.name : "Ingen"}
        />
        <RailMetric label="Ordre" value={orders.length} />
        <RailMetric label="Poser" value={bagCount} />
        <RailMetric label="Kaffe" value={round?.coffees.length ?? 0} />
        <RailMetric
          label="Stenger"
          value={formatDate(round?.closesAt ?? null)}
        />
      </div>
    </section>
  )
}

function LastRoundStats({ rounds }: { rounds: Dashboard["closedRounds"] }) {
  const hasLastRound = rounds.length > 0
  const lastRound = rounds[0]
  const orders = hasLastRound ? lastRound.orders : []
  const paidCount = orders.filter((order) => order.paid).length
  const collectedCount = orders.filter((order) => order.collected).length

  return (
    <section className="rounded-lg border border-(--ledger-line) bg-card p-4">
      <div className="border-b border-border pb-3">
        <p className="font-mono text-xs tracking-[0.18em] text-muted-foreground uppercase">
          SISTE
        </p>
        <h2 className="mt-1 text-lg">Forrige oppgjør</h2>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <RailMetric
          label="Leverandør"
          value={
            hasLastRound && lastRound.supplier
              ? lastRound.supplier.name
              : "Ingen"
          }
        />
        <RailMetric label="Ordre" value={orders.length} />
        <RailMetric label="Betalt" value={`${paidCount}/${orders.length}`} />
        <RailMetric
          label="Hentet"
          value={`${collectedCount}/${orders.length}`}
        />
        <RailMetric label="Arkiv" value={rounds.length} />
        <RailMetric label="Poser" value={countBags(orders)} />
      </div>
    </section>
  )
}

function countBags(orders: Round["orders"]) {
  return orders.reduce(
    (sum, order) =>
      sum + order.items.reduce((itemSum, item) => itemSum + item.quantity, 0),
    0
  )
}

function RailMetric({
  label,
  value,
}: {
  label: string
  value: React.ReactNode
}) {
  return (
    <div className="rounded-md border border-border p-3">
      <p className="font-mono text-[0.62rem] tracking-[0.14em] text-muted-foreground uppercase">
        {label}
      </p>
      <p className="mt-1 truncate font-mono text-base font-semibold">{value}</p>
    </div>
  )
}

function CatalogSection({
  dashboard,
  refresh,
}: {
  dashboard: Dashboard
  refresh: () => Promise<void>
}) {
  const [supplierId, setSupplierId] = useState(dashboard.suppliers[0]?.id ?? "")
  const [showInactive, setShowInactive] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Array<string>>([])
  const [closesAt, setClosesAt] = useState("")
  const selectedSupplier =
    dashboard.suppliers.find((supplier) => supplier.id === supplierId) ??
    dashboard.suppliers[0]
  const supplierCoffees = dashboard.coffees.filter(
    (coffee) => coffee.supplierId === selectedSupplier.id
  )
  const visibleCoffees = supplierCoffees.filter(
    (coffee) => showInactive || coffee.isActive
  )
  const lastPrice = supplierCoffees[0]?.priceKr ?? 139

  function toggleCoffee(id: string) {
    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter((selectedId) => selectedId !== id)
        : [...current, id]
    )
  }

  async function handleOpenRound() {
    await openRound({
      data: {
        supplierId: selectedSupplier.id,
        coffeeIds: selectedIds,
        closesAt: closesAt ? new Date(closesAt).toISOString() : null,
      },
    })
    await refresh()
  }

  return (
    <section className="rounded-lg border border-(--ledger-line) bg-card">
      <div className="flex items-center justify-between gap-4 border-b border-border p-4 sm:p-5">
        <SectionTitle
          kicker="01"
          title="Kaffe"
          subtitle="Velg leverandør. Marker varelinjer."
        />
      </div>
      <div className="space-y-4 p-4 sm:p-5">
        <div className="flex flex-wrap gap-2">
          {dashboard.suppliers.map((supplier) => (
            <Button
              key={supplier.id}
              variant={
                supplier.id === selectedSupplier.id ? "default" : "outline"
              }
              size="sm"
              type="button"
              onClick={() => {
                setSupplierId(supplier.id)
                setSelectedIds([])
              }}
            >
              {supplier.name}
            </Button>
          ))}
        </div>

        <label className="inline-flex items-center gap-2 text-sm text-muted-foreground">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(event) => setShowInactive(event.target.checked)}
          />
          Vis inaktive
        </label>

        <div className="overflow-hidden rounded-lg border border-border pt-4">
          {visibleCoffees.map((coffee) => (
            <CoffeeRow
              key={coffee.id}
              coffee={coffee}
              selected={selectedIds.includes(coffee.id)}
              onToggle={() => toggleCoffee(coffee.id)}
              refresh={refresh}
            />
          ))}
          {visibleCoffees.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">
              Ingen kaffe ennå.
            </p>
          ) : null}
        </div>

        <AddCoffeeForm
          supplier={selectedSupplier}
          defaultPriceKr={lastPrice}
          onAdded={(coffee) =>
            setSelectedIds((current) => [...current, coffee.id])
          }
          refresh={refresh}
        />

        <div className="grid gap-3 rounded-lg border border-border bg-muted/30 p-3 sm:grid-cols-[1fr_auto] sm:items-end">
          <label className="space-y-1">
            <span className="text-sm font-medium">Stenger (valgfritt)</span>
            <input
              className="h-10 w-full rounded-md border border-input px-3 font-mono text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30"
              type="datetime-local"
              value={closesAt}
              onChange={(event) => setClosesAt(event.target.value)}
            />
          </label>
          <Button
            className="w-full sm:w-auto"
            size="lg"
            disabled={selectedIds.length === 0}
            onClick={handleOpenRound}
            type="button"
          >
            Åpne runde med {selectedIds.length} kaffe
          </Button>
        </div>
      </div>
    </section>
  )
}

function CoffeeRow({
  coffee,
  selected,
  onToggle,
  refresh,
}: {
  coffee: Coffee
  selected: boolean
  onToggle: () => void
  refresh: () => Promise<void>
}) {
  const [isEditing, setIsEditing] = useState(false)

  return (
    <div className="border-b border-border last:border-b-0">
      <button
        className="grid w-full gap-3 p-3 text-left hover:bg-muted/60 sm:grid-cols-[minmax(0,1fr)_7rem_6rem] sm:items-center"
        type="button"
        onClick={onToggle}
      >
        <span className="flex min-w-0 items-center gap-3">
          {coffee.imageUrl ? (
            <img
              className="size-11 shrink-0 rounded-md object-cover"
              src={coffee.imageUrl}
              alt={coffee.name}
              loading="lazy"
            />
          ) : (
            <span className="size-11 shrink-0 rounded-md border border-border bg-muted" />
          )}
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold">
              {coffee.name}
            </span>
            <span className="block truncate text-sm text-muted-foreground">
              {coffee.description || "Ingen beskrivelse"}
            </span>
          </span>
        </span>
        <span className="font-mono text-sm font-semibold">
          {formatKr(coffee.priceKr)}
        </span>
        <span className="justify-self-start sm:justify-self-end">
          <StatusPill
            active={selected}
            label={
              selected ? "Valgt" : coffee.isActive ? "Legg til" : "Inaktiv"
            }
          />
        </span>
      </button>
      <div className="mt-2 flex gap-3 border-t border-border px-3 pt-3 pb-3">
        <Button
          variant="secondary"
          size="xs"
          type="button"
          onClick={() => setIsEditing((value) => !value)}
        >
          Rediger
        </Button>
        <Button
          variant="destructive"
          size="xs"
          type="button"
          onClick={async () => {
            await archiveCoffee({ data: { id: coffee.id } })
            await refresh()
          }}
        >
          <Trash2 /> Slett
        </Button>
      </div>
      {isEditing ? <EditCoffeeForm coffee={coffee} refresh={refresh} /> : null}
    </div>
  )
}

function AddCoffeeForm({
  supplier,
  defaultPriceKr,
  onAdded,
  refresh,
}: {
  supplier: Supplier
  defaultPriceKr: number
  onAdded: (coffee: Coffee) => void
  refresh: () => Promise<void>
}) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [imageUrl, setImageUrl] = useState("")
  const [price, setPrice] = useState(String(defaultPriceKr))

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const coffee = await addCoffee({
      data: {
        supplierId: supplier.id,
        name,
        description,
        imageUrl,
        priceKr: parseKroner(price),
      },
    })
    onAdded(coffee)
    setName("")
    setDescription("")
    setImageUrl("")
    setPrice(String(coffee.priceKr))
    await refresh()
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="grid grid-cols-3 gap-2 rounded-lg border border-border bg-muted/40 p-3 md:grid-cols-5"
    >
      <input
        className="h-9 rounded-md border border-input px-3 text-sm outline-none focus-visible:border-ring"
        placeholder="Navn"
        value={name}
        onChange={(event) => setName(event.target.value)}
      />
      <input
        className="h-9 rounded-md border border-input px-3 text-sm outline-none focus-visible:border-ring"
        placeholder="Beskrivelse"
        value={description}
        onChange={(event) => setDescription(event.target.value)}
      />
      <input
        className="h-9 rounded-md border border-input px-3 text-sm outline-none focus-visible:border-ring"
        placeholder="Bilde-URL"
        type="url"
        value={imageUrl}
        onChange={(event) => setImageUrl(event.target.value)}
      />
      <input
        className="h-9 rounded-md border border-input px-3 font-mono text-sm outline-none focus-visible:border-ring"
        inputMode="numeric"
        pattern="\d*"
        value={price}
        onChange={(event) => setPrice(event.target.value.replace(/\D/g, ""))}
      />
      <Button type="submit" className="h-full">
        Legg til
      </Button>
    </form>
  )
}

function EditCoffeeForm({
  coffee,
  refresh,
}: {
  coffee: Coffee
  refresh: () => Promise<void>
}) {
  const [name, setName] = useState(coffee.name)
  const [description, setDescription] = useState(coffee.description)
  const [imageUrl, setImageUrl] = useState(coffee.imageUrl)
  const [price, setPrice] = useState(String(coffee.priceKr))
  const [isActive, setIsActive] = useState(coffee.isActive)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    await updateCoffee({
      data: {
        id: coffee.id,
        supplierId: coffee.supplierId,
        name,
        description,
        imageUrl,
        priceKr: parseKroner(price),
        isActive,
      },
    })
    await refresh()
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mx-3 mb-3 grid gap-2 rounded-lg border border-border bg-muted/40 p-3 sm:grid-cols-[1fr_1fr_1fr_7rem_auto_auto]"
    >
      <input
        className="h-9 rounded-md border border-input px-3 text-sm outline-none focus-visible:border-ring"
        value={name}
        onChange={(event) => setName(event.target.value)}
      />
      <input
        className="h-9 rounded-md border border-input px-3 text-sm outline-none focus-visible:border-ring"
        value={description}
        onChange={(event) => setDescription(event.target.value)}
      />
      <input
        className="h-9 rounded-md border border-input px-3 text-sm outline-none focus-visible:border-ring"
        placeholder="Bilde-URL"
        type="url"
        value={imageUrl}
        onChange={(event) => setImageUrl(event.target.value)}
      />
      <input
        className="h-9 rounded-md border border-input px-3 font-mono text-sm outline-none focus-visible:border-ring"
        inputMode="numeric"
        pattern="\d*"
        value={price}
        onChange={(event) => setPrice(event.target.value.replace(/\D/g, ""))}
      />
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={isActive}
          onChange={(event) => setIsActive(event.target.checked)}
        />{" "}
        Aktiv
      </label>
      <Button type="submit">Lagre</Button>
    </form>
  )
}

function OpenRoundSection({
  round,
  refresh,
}: {
  round: NonNullable<Dashboard["openRound"]>
  refresh: () => Promise<void>
}) {
  const [closesAt, setClosesAt] = useState(formatDateTimeLocal(round.closesAt))
  const [deadlineSaved, setDeadlineSaved] = useState(false)

  async function handleSaveClosesAt() {
    await updateRoundClosesAt({
      data: {
        roundId: round.id,
        closesAt: closesAt ? new Date(closesAt).toISOString() : null,
      },
    })
    setDeadlineSaved(true)
    window.setTimeout(() => setDeadlineSaved(false), 1800)
    await refresh()
  }

  async function handleClose() {
    await closeRound({ data: { roundId: round.id } })
    await refresh()
  }

  return (
    <section className="rounded-lg border border-(--ledger-line) bg-card">
      <div className="flex items-center justify-between gap-4 border-b border-border p-4 sm:p-5">
        <SectionTitle
          kicker="02"
          title="Bestilling"
          subtitle={`${round.supplier?.name}. Runde aktiv.`}
        />
        <StatusPill active label="Aktiv" />
      </div>
      <div className="space-y-4 p-4 sm:p-5">
        <ActiveCoffeesSummary coffees={round.coffees} />
        <RoundGrandMetrics shippingKr={0} orders={round.orders} />
        <BulkCoffeeTotals orders={round.orders} />
        <OrderList orders={round.orders} refresh={refresh} />
        <div className="grid gap-3 rounded-lg border border-border bg-muted/30 p-3 sm:grid-cols-[1fr_auto] sm:items-end">
          <label className="space-y-1">
            <span className="text-sm font-medium">Stenger (valgfritt)</span>
            <input
              className="h-9 w-full rounded-md border border-input px-3 font-mono text-sm outline-none focus-visible:border-ring"
              type="datetime-local"
              value={closesAt}
              onChange={(event) => setClosesAt(event.target.value)}
            />
          </label>
          <Button
            variant="secondary"
            type="button"
            onClick={handleSaveClosesAt}
          >
            {deadlineSaved ? "Lagret" : "Lagre stenging"}
          </Button>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-muted/40 p-3">
          <p className="text-sm text-muted-foreground">
            Lukk når ekstern bestilling er sendt. Frakt kan settes senere i
            oppgjør.
          </p>
          <Button type="button" onClick={handleClose}>
            Lukk runde
          </Button>
        </div>
      </div>
    </section>
  )
}

function ActiveCoffeesSummary({
  coffees,
}: {
  coffees: NonNullable<Dashboard["openRound"]>["coffees"]
}) {
  return (
    <section className="rounded-lg border border-border bg-muted/20 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-xs tracking-[0.16em] text-muted-foreground uppercase">
          Aktiv kaffe
        </span>
        {coffees.map((coffee) => (
          <span
            key={coffee.id}
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card/70 px-2 py-1 font-mono text-xs text-muted-foreground"
          >
            {coffee.nameSnapshot}{" "}
            {formatKr(addCoffeeVat(coffee.priceKrSnapshot))}
          </span>
        ))}
      </div>
    </section>
  )
}

function RoundGrandMetrics({
  shippingKr,
  orders,
}: {
  shippingKr: number
  orders: Round["orders"]
}) {
  const totals = calculateRoundGrandTotals({ shippingKr, orders })

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <RailMetric label="Total poser" value={totals.bagCount} />
      <RailMetric
        label="Kaffe totalt"
        value={formatKr(totals.coffeeSubtotalKr)}
      />
      <RailMetric label="Sum totalt" value={formatKr(totals.totalKr)} />
    </div>
  )
}

type CoffeeQuantityItem = {
  name: string
  imageUrl?: string
  quantity: number
}

function CoffeeQuantitySection({
  title,
  items,
  compact = false,
}: {
  title: string
  items: Array<CoffeeQuantityItem>
  compact?: boolean
}) {
  const visibleItems = items.filter((item) => item.quantity > 0)
  if (visibleItems.length === 0) return null

  return (
    <section className="rounded-lg border border-border bg-muted/30 p-3">
      <h3 className={compact ? "text-base" : "text-lg"}>{title}</h3>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {visibleItems.map((coffee) => (
          <div
            key={coffee.name}
            className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-md border border-border bg-card p-2 text-sm"
          >
            <span className="flex min-w-0 items-center gap-2">
              {coffee.imageUrl ? (
                <img
                  className="size-8 shrink-0 rounded object-cover"
                  src={coffee.imageUrl}
                  alt=""
                  loading="lazy"
                />
              ) : (
                <span className="size-8 shrink-0 rounded border border-border bg-muted" />
              )}
              <span className="truncate font-medium">{coffee.name}</span>
            </span>
            <span className="shrink-0 font-mono">{coffee.quantity} poser</span>
          </div>
        ))}
      </div>
    </section>
  )
}

function BulkCoffeeTotals({ orders }: { orders: Round["orders"] }) {
  return (
    <CoffeeQuantitySection
      title="Samlet ordre"
      items={calculateCoffeeTotals(orders)}
    />
  )
}

function OrderList({
  orders,
  refresh,
}: {
  orders: Round["orders"]
  refresh: () => Promise<void>
}) {
  if (orders.length === 0)
    return (
      <p className="rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
        Ingen ordre ennå.
      </p>
    )

  const totalsByOrderId = new Map(
    calculateRoundTotals({ shippingKr: 0, orders }).map((total) => [
      total.orderId,
      total,
    ])
  )

  return (
    <div className="overflow-hidden rounded-lg border border-border">
      {orders.map((order) => {
        const total = totalsByOrderId.get(order.id)
        const bagCount =
          total?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0

        return (
          <article
            key={order.id}
            className="border-b border-border p-3 last:border-b-0"
          >
            <div className="grid gap-3 sm:grid-cols-[10rem_minmax(0,1fr)_auto] sm:items-center">
              <div>
                <h3 className="text-lg">{order.customerName}</h3>
                <p className="font-mono text-sm text-muted-foreground">
                  {bagCount} poser · {formatKr(total?.totalKr ?? 0)}
                </p>
              </div>
              <ul className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                {order.items.map((item) => (
                  <li
                    key={`${order.id}-${item.name}`}
                    className="rounded-md border border-border bg-muted/30 px-2 py-1"
                  >
                    <span className="font-mono text-foreground">
                      {item.quantity} ×
                    </span>{" "}
                    {item.name}
                  </li>
                ))}
              </ul>
              <Button
                variant="destructive"
                size="xs"
                type="button"
                onClick={async () => {
                  await deleteOrder({ data: { orderId: order.id } })
                  await refresh()
                }}
              >
                Slett
              </Button>
            </div>
          </article>
        )
      })}
    </div>
  )
}

function CustomersSection({
  customers,
}: {
  customers: Dashboard["customers"]
}) {
  return (
    <section className="rounded-lg border border-(--ledger-line) bg-card">
      <div className="flex items-center justify-between gap-4 border-b border-border p-4 sm:p-5">
        <SectionTitle
          kicker="04"
          title="Kunder"
          subtitle="Registrerte personer i bestillingsrommet."
        />
        <span className="font-mono text-xs text-muted-foreground">
          {customers.length} personer
        </span>
      </div>
      <div className="overflow-hidden">
        {customers.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">
            Ingen registrerte personer ennå.
          </p>
        ) : null}
        {customers.map((customer) => (
          <div
            key={customer.id}
            className="grid gap-2 border-b border-border p-4 last:border-b-0 sm:grid-cols-[1fr_9rem_1fr_auto] sm:items-center"
          >
            <div>
              <p className="font-medium">{customer.name}</p>
              <p className="font-mono text-xs text-muted-foreground">
                Registrert {formatDate(customer.createdAt)}
              </p>
            </div>
            <p className="font-mono text-sm">{customer.phone}</p>
            <p className="truncate font-mono text-sm text-muted-foreground">
              {customer.email}
            </p>
            <StatusPill
              active={customer.isActive}
              label={customer.isActive ? "Aktiv" : "Inaktiv"}
            />
          </div>
        ))}
      </div>
    </section>
  )
}

function HistorySection({
  rounds,
  refresh,
}: {
  rounds: Dashboard["closedRounds"]
  refresh: () => Promise<void>
}) {
  const [selectedRoundId, setSelectedRoundId] = useState(rounds[0]?.id ?? "")
  const selectedRound =
    rounds.find((round) => round.id === selectedRoundId) ?? rounds[0]

  return (
    <section className="rounded-lg border border-(--ledger-line) bg-card">
      <div className="flex items-center justify-between gap-4 border-b border-border p-4 sm:p-5">
        <SectionTitle
          kicker="03"
          title="Oppgjør"
          subtitle="Siste runde vises først."
        />
        <span className="font-mono text-xs text-muted-foreground">
          {rounds.length} arkiv
        </span>
      </div>
      <div className="space-y-4 p-4 sm:p-5">
        {rounds.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Ingen avsluttede runder.
          </p>
        ) : null}
        {rounds.length > 0 ? (
          <select
            className="h-9 w-full rounded-md border border-input py-0 pr-10 pl-3 text-sm outline-none focus-visible:border-ring"
            value={selectedRound.id}
            onChange={(event) => setSelectedRoundId(event.target.value)}
          >
            {rounds.map((round) => (
              <option key={round.id} value={round.id}>
                {round.supplier ? round.supplier.name : "Ukjent"}{" "}
                {formatDate(round.closedAt)}
              </option>
            ))}
          </select>
        ) : null}
        {rounds.length > 0 ? (
          <ClosedRoundSummary round={selectedRound} refresh={refresh} />
        ) : null}
      </div>
    </section>
  )
}

function ClosedRoundSummary({
  round,
  refresh,
}: {
  round: Dashboard["closedRounds"][number]
  refresh: () => Promise<void>
}) {
  const [shipping, setShipping] = useState(String(round.shippingKr))
  const [shippingSaved, setShippingSaved] = useState(false)
  const totals = calculateRoundTotals({
    shippingKr: round.shippingKr,
    orders: round.orders,
  })
  const isReady = round.status === "ready"

  return (
    <div className="space-y-4">
      <div className="grid gap-3 rounded-lg border border-border bg-muted/30 p-3 text-sm sm:grid-cols-4">
        <Meta label="Status" value={isReady ? "Klar for henting" : "På vei"} />
        <Meta label="Leverandør" value={round.supplier?.name ?? "Ukjent"} />
        <Meta label="Åpnet" value={formatDate(round.openedAt)} />
        <Meta label="Frakt" value={formatKr(round.shippingKr)} />
      </div>

      <RoundGrandMetrics shippingKr={round.shippingKr} orders={round.orders} />

      <div className="grid gap-3 rounded-lg border border-border bg-muted/30 p-3 sm:grid-cols-[1fr_auto_auto] sm:items-end">
        <label className="space-y-1">
          <span className="text-sm font-medium">Frakt i kroner</span>
          <input
            className="h-9 w-full rounded-md border border-input px-3 font-mono outline-none focus-visible:border-ring"
            inputMode="numeric"
            pattern="\d*"
            value={shipping}
            onChange={(event) =>
              setShipping(event.target.value.replace(/\D/g, ""))
            }
          />
        </label>
        <Button
          variant="secondary"
          type="button"
          onClick={async () => {
            await updateRoundShipping({
              data: { roundId: round.id, shippingKr: parseKroner(shipping) },
            })
            setShippingSaved(true)
            window.setTimeout(() => setShippingSaved(false), 1800)
            await refresh()
          }}
        >
          {shippingSaved ? "Lagret" : "Lagre frakt"}
        </Button>
        <Button
          type="button"
          disabled={isReady}
          onClick={async () => {
            await markRoundReadyForPickup({ data: { roundId: round.id } })
            await refresh()
          }}
        >
          {isReady ? "Klar for henting" : "Merk klar for henting"}
        </Button>
      </div>

      <BulkCoffeeTotals orders={round.orders} />

      <div className="overflow-hidden rounded-lg border border-border">
        {totals.map((total) => (
          <ClosedOrderRow key={total.orderId} total={total} refresh={refresh} />
        ))}
      </div>
    </div>
  )
}

function ClosedOrderRow({
  total,
  refresh,
}: {
  total: ReturnType<typeof calculateRoundTotals>[number]
  refresh: () => Promise<void>
}) {
  const [expanded, setExpanded] = useState(true)
  const [copied, setCopied] = useState(false)

  async function copyPaymentLink() {
    const link = `${window.location.origin}/bestilling/${total.orderId}`
    await navigator.clipboard.writeText(link)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1800)
  }

  return (
    <article className="border-b border-border p-3 last:border-b-0">
      <button
        className="grid w-full gap-3 text-left sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center"
        type="button"
        onClick={() => setExpanded((value) => !value)}
      >
        <span>
          <span className="block font-semibold">{total.customerName}</span>
          <span className="font-mono text-sm text-muted-foreground">
            {total.items.reduce((sum, item) => sum + item.quantity, 0)} poser{" "}
            {formatKr(total.totalKr)}
          </span>
        </span>
        <span className="flex flex-wrap items-center gap-2">
          <PaymentStatusPill checked={total.paid} />
          <PickupStatusPill checked={total.collected} />
        </span>
        <span className="self-center justify-self-start font-mono text-sm text-muted-foreground sm:justify-self-end">
          {expanded ? "Skjul" : "Detaljer"}
        </span>
      </button>

      {expanded ? (
        <div className="mt-3 border-t border-border pt-3">
          <CoffeeQuantitySection
            title={`Hentes av ${total.customerName}`}
            items={total.items}
            compact
          />
          <div className="mt-3 grid gap-1 font-mono text-sm">
            <p>Kaffe: {formatKr(total.coffeeSubtotalKr)}</p>
            <p>Frakt: {formatKr(total.shippingShareKr)}</p>
            <p className="font-semibold">Totalt: {formatKr(total.totalKr)}</p>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              variant={total.paid ? "default" : "secondary"}
              size="sm"
              type="button"
              onClick={async () => {
                await updateOrderFlags({
                  data: {
                    orderId: total.orderId,
                    paid: !total.paid,
                    collected: total.collected,
                  },
                })
                await refresh()
              }}
            >
              Er betalt
            </Button>
            <Button
              variant={total.collected ? "default" : "secondary"}
              size="sm"
              type="button"
              onClick={async () => {
                await updateOrderFlags({
                  data: {
                    orderId: total.orderId,
                    paid: total.paid,
                    collected: !total.collected,
                  },
                })
                await refresh()
              }}
            >
              Er hentet
            </Button>
            <Button
              variant="secondary"
              size="sm"
              type="button"
              onClick={copyPaymentLink}
            >
              {copied ? "Kopiert" : "Kopier bestillingslenke"}
            </Button>
          </div>
        </div>
      ) : null}
    </article>
  )
}

function SectionTitle({
  kicker,
  title,
  subtitle,
}: {
  kicker: string
  title: string
  subtitle: string
}) {
  return (
    <div>
      <p className="font-mono text-xs tracking-[0.18em] text-muted-foreground uppercase">
        {kicker}
      </p>
      <h2 className="mt-1 text-xl tracking-tight">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
    </div>
  )
}

function Meta({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="font-mono text-[0.62rem] tracking-[0.14em] text-muted-foreground uppercase">
        {label}
      </p>
      <p className="mt-1 font-medium">{value}</p>
    </div>
  )
}

function StatusPill({ active, label }: { active: boolean; label: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 font-mono text-xs ${active ? "border-(--ledger-ink) text-foreground" : "border-border text-muted-foreground"}`}
    >
      {active ? <Check className="size-3" /> : <Circle className="size-3" />}
      {label}
    </span>
  )
}

function PaymentStatusPill({ checked }: { checked: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 font-mono text-xs ${
        checked
          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
          : "border-slate-200 bg-slate-50 text-slate-600"
      }`}
    >
      {checked ? <Check className="size-3" /> : <Circle className="size-3" />}
      {checked ? "Betalt" : "Ikke betalt"}
    </span>
  )
}

function PickupStatusPill({ checked }: { checked: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 font-mono text-xs ${
        checked
          ? "border-sky-200 bg-sky-50 text-sky-800"
          : "border-slate-200 bg-slate-50 text-slate-600"
      }`}
    >
      {checked ? <Check className="size-3" /> : <Circle className="size-3" />}
      {checked ? "Hentet" : "Ikke hentet"}
    </span>
  )
}

function formatDate(value: Date | string | null) {
  if (!value) return "—"
  return new Intl.DateTimeFormat("nb-NO", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value))
}

function formatDateTimeLocal(value: Date | string | null) {
  if (!value) return ""
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return ""

  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  return offsetDate.toISOString().slice(0, 16)
}
