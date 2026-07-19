import { useState } from "react"
import {
  ArrowRight,
  Check,
  ChevronDown,
  Circle,
  Copy,
  MoreHorizontal,
  Trash2,
} from "lucide-react"
import {
  Link,
  Outlet,
  createFileRoute,
  useLocation,
  useRouter,
} from "@tanstack/react-router"
import type { CoffeeOrderHistory } from "@/lib/admin-rounds"
import { AdminVoteTally } from "@/components/admin-vote-tally"
import { BRAND_NAME } from "@/components/brand"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  getAdminActionQueue,
  getDefaultBulkOrderExpanded,
  getDefaultOrderExpanded,
  getRoundArchiveSections,
  sortAdminOrderTotals,
  summarizeAdminRound,
  summarizeCoffeeOrderHistory,
} from "@/lib/admin-rounds"
import {
  getCustomerEmailHref,
  getCustomerPhoneHref,
  getCustomerRowClasses,
} from "@/lib/admin-customer-ui"
import { formatKr, parseKroner } from "@/lib/money"
import { getNextPickupWindowSelections } from "@/lib/pickup-slots"
import {
  getOrderMoneyDetailRows,
  getOrderStatusPillClasses,
} from "@/lib/admin-order-row-ui"
import {
  calculateCoffeeTotals,
  calculateRoundGrandTotals,
  calculateRoundTotals,
} from "@/lib/order-totals"
import { addCoffeeVat } from "@/lib/vat"
import {
  addCoffee,
  archiveCoffee,
  closeRound,
  deleteOrder,
  getAdminDashboard,
  openRound,
  setCustomerActive,
  setCustomerRole,
  updateCoffee,
  updateOrderFlags,
  updateRoundDetails,
} from "@/server/coffee"

export const Route = createFileRoute("/admin")({
  loader: () => getAdminDashboard(),
  component: AdminPage,
})

export type Dashboard = Extract<
  Awaited<ReturnType<typeof getAdminDashboard>>,
  { unlocked: true }
>
type Coffee = Dashboard["coffees"][number]
type Supplier = Dashboard["suppliers"][number]
export type Round =
  | NonNullable<Dashboard["openRound"]>
  | Dashboard["closedRounds"][number]

function AdminPage() {
  const data = Route.useLoaderData()
  const location = useLocation()
  const router = useRouter()

  if (location.pathname !== "/admin") return <Outlet />

  return (
    <main className="min-h-svh px-4 py-5 text-foreground sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-7xl space-y-5">
        <AdminHeader />
        {!data.unlocked ? <AdminAccessNotice /> : null}
        {data.unlocked ? (
          <DashboardView dashboard={data} refresh={() => router.invalidate()} />
        ) : null}
      </div>
    </main>
  )
}

export function AdminHeader() {
  const location = useLocation()
  const showAdminBackLink = location.pathname !== "/admin"

  return (
    <header className="flex items-center justify-between gap-4 border-b border-(--ledger-line) py-4">
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
      <nav className="flex items-center gap-3" aria-label="Adminnavigasjon">
        {showAdminBackLink ? (
          <Link
            to="/admin"
            className="inline-flex rounded-md border border-border px-3 py-2 text-sm font-medium hover:bg-muted/60 focus-visible:ring-[3px] focus-visible:ring-ring/30 focus-visible:outline-none"
          >
            Tilbake til admin
          </Link>
        ) : null}
      </nav>
    </header>
  )
}

export function AdminAccessNotice() {
  return (
    <div className="max-w-md rounded-lg border border-(--ledger-line) bg-card p-5">
      <p className="font-mono text-xs tracking-[0.18em] text-muted-foreground uppercase">
        TILGANG
      </p>
      <h2 className="mt-2 text-xl">Ingen admintilgang</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Denne siden krever en adminkonto. Logg inn med en konto som har
        admintilgang, eller be en admin om tilgang.
      </p>
      <Button className="mt-5" variant="outline" render={<Link to="/" />}>
        Til forsiden
      </Button>
    </div>
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
          <StartRoundSection dashboard={dashboard} refresh={refresh} />
        )}
        <AdminIndexLinks dashboard={dashboard} />
        <RoundsCardList
          currentRound={dashboard.openRound}
          closedRounds={dashboard.closedRounds}
        />
      </div>
      <StatusRail dashboard={dashboard} />
    </div>
  )
}

function StatusRail({ dashboard }: { dashboard: Dashboard }) {
  const latestClosedRound = dashboard.closedRounds.at(0) ?? null
  const unpaidOrders = sortOrdersByCustomerName(
    latestClosedRound?.orders.filter((order) => !order.paid) ?? []
  )
  const uncollectedOrders = sortOrdersByCustomerName(
    latestClosedRound?.orders.filter((order) => !order.collected) ?? []
  )
  const listedWorkCount = unpaidOrders.length + uncollectedOrders.length
  const items = getAdminActionQueue({
    openRound: dashboard.openRound,
    closedRounds: dashboard.closedRounds,
  }).filter(
    (item) =>
      !["Ikke betalt", "Ikke hentet"].includes(item.label) &&
      !(listedWorkCount > 0 && item.label === "Ingen åpne punkter")
  )

  return (
    <aside className="space-y-5 lg:sticky lg:top-5">
      {dashboard.voteTally.length > 0 ? (
        <AdminVoteTally tally={dashboard.voteTally} />
      ) : null}
      <section className="rounded-lg border border-(--ledger-line) bg-card p-4">
        <div className="border-b border-border pb-3">
          <p className="font-mono text-xs tracking-[0.18em] text-muted-foreground uppercase">
            Kø
          </p>
          <h2 className="mt-1 text-lg">Neste handling</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Kun punkter som krever oppmerksomhet.
          </p>
        </div>

        <div className="mt-4 space-y-2">
          {items.map((item) => (
            <div
              key={`${item.label}-${item.value}`}
              className="rounded-md border border-border p-3"
            >
              <p className="font-mono text-[0.62rem] tracking-[0.14em] text-muted-foreground uppercase">
                {item.label}
              </p>
              <p
                className={`mt-1 text-sm font-medium ${
                  item.tone === "attention" ? "text-destructive" : ""
                }`}
              >
                {item.value}
              </p>
            </div>
          ))}
          {listedWorkCount === 0 && items.length === 0 ? (
            <div className="rounded-md border border-border p-3">
              <p className="font-mono text-[0.62rem] tracking-[0.14em] text-muted-foreground uppercase">
                Ingen åpne punkter
              </p>
              <p className="mt-1 text-sm font-medium">Alt ser ryddig ut</p>
            </div>
          ) : null}
          {unpaidOrders.length > 0 ? (
            <PendingCustomerCard label="Ikke betalt" orders={unpaidOrders} />
          ) : null}
          {uncollectedOrders.length > 0 ? (
            <PendingCustomerCard
              label="Ikke hentet"
              orders={uncollectedOrders}
            />
          ) : null}
        </div>

        <PickupWindowBlock dashboard={dashboard} />
      </section>
    </aside>
  )
}

function sortOrdersByCustomerName<TOrder extends { customerName: string }>(
  orders: Array<TOrder>
) {
  return [...orders].sort((left, right) =>
    left.customerName.localeCompare(right.customerName, "nb-NO")
  )
}

function PendingCustomerCard<TOrder extends { customerName: string }>({
  label,
  orders,
}: {
  label: string
  orders: Array<TOrder>
}) {
  return (
    <div className="rounded-md border border-border p-3">
      <div className="flex items-center justify-between gap-3">
        <p className="font-mono text-[0.62rem] tracking-[0.14em] text-muted-foreground uppercase">
          {label}
        </p>
        <span className="font-mono text-xs text-muted-foreground">
          {orders.length}
        </span>
      </div>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        {orders.map((order) => order.customerName).join(", ")}
      </p>
    </div>
  )
}

function PickupWindowBlock({ dashboard }: { dashboard: Dashboard }) {
  const pickupOrders = dashboard.closedRounds
    .filter((round) => round.status === "ready")
    .flatMap((round) => round.orders)
  const windows = getNextPickupWindowSelections({
    slots: dashboard.pickupSlots,
    orders: pickupOrders,
    limit: 2,
  })

  return (
    <div className="mt-5 border-t border-border pt-4">
      <div>
        <p className="font-mono text-xs tracking-[0.18em] text-muted-foreground uppercase">
          Tidsvinduer
        </p>
        <h3 className="mt-1 text-base font-medium">Neste hentetider</h3>
      </div>

      {windows.length === 0 ? (
        <p className="mt-3 rounded-md border border-border bg-muted/20 p-3 text-sm text-muted-foreground">
          Ingen hentetider er lagt ut.
        </p>
      ) : (
        <div className="mt-3 space-y-3">
          {windows.map((window) => (
            <article
              key={window.id}
              className="rounded-md border border-border"
            >
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 border-b border-border px-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate leading-tight font-medium">
                    {window.dateLabel}
                  </p>
                  <p className="mt-1 font-mono text-xs text-muted-foreground">
                    {window.timeLabel}
                  </p>
                </div>
                <div className="text-right font-mono text-xs text-muted-foreground">
                  <p>{window.orderCount} valgt</p>
                  <p className="mt-1">{window.bagCount} poser</p>
                </div>
              </div>
              <div className="divide-y divide-border">
                {window.orders.length === 0 ? (
                  <p className="px-3 py-2.5 text-sm text-muted-foreground">
                    Ingen har valgt dette vinduet.
                  </p>
                ) : (
                  window.orders.map((order) =>
                    order.collected ? (
                      <div
                        key={order.id}
                        className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-3 py-2.5 text-sm"
                      >
                        <p className="min-w-0 truncate font-medium">
                          {order.customerName}
                        </p>
                        <PickupStatusPill checked={order.collected} />
                      </div>
                    ) : (
                      <Link
                        key={order.id}
                        to="/admin/runder/$roundId/hentemodus"
                        params={{ roundId: order.roundId }}
                        search={{ order: order.id }}
                        className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-3 py-2.5 text-sm transition-colors hover:bg-muted/30 focus-visible:ring-[3px] focus-visible:ring-ring/30 focus-visible:outline-none"
                      >
                        <p className="min-w-0 truncate font-medium">
                          {order.customerName}
                        </p>
                        <PickupStatusPill checked={order.collected} />
                      </Link>
                    )
                  )
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
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

function StartRoundSection({
  dashboard,
  refresh,
}: {
  dashboard: Dashboard
  refresh: () => Promise<void>
}) {
  return (
    <section
      id="ny-runde"
      className="rounded-lg border border-(--ledger-line) bg-card"
    >
      <div className="flex items-center justify-between gap-4 border-b border-border p-4 sm:p-5">
        <SectionTitle
          title="Ny innkjøpsrunde"
          subtitle="Åpne detaljer når du skal starte neste bestilling."
        />
      </div>
      <details className="group">
        <summary className="cursor-pointer list-none p-4 text-sm font-medium text-muted-foreground hover:text-foreground sm:p-5">
          <span className="rounded-md border border-border px-3 py-2 group-open:bg-muted/50">
            Start ny runde
          </span>
        </summary>
        <div className="border-t border-border">
          <RoundStarter dashboard={dashboard} refresh={refresh} />
        </div>
      </details>
    </section>
  )
}

function RoundStarter({
  dashboard,
  refresh,
}: {
  dashboard: Dashboard
  refresh: () => Promise<void>
}) {
  const [supplierId, setSupplierId] = useState(dashboard.suppliers[0]?.id ?? "")
  const [selectedIds, setSelectedIds] = useState<Array<string>>([])
  const [closesAt, setClosesAt] = useState("")
  const [notifyMembers, setNotifyMembers] = useState(false)
  const selectedSupplier =
    dashboard.suppliers.find((supplier) => supplier.id === supplierId) ??
    dashboard.suppliers[0]
  const visibleCoffees = dashboard.coffees.filter(
    (coffee) => coffee.supplierId === selectedSupplier.id && coffee.isActive
  )
  const coffeeHistory = summarizeCoffeeOrderHistory(dashboard.closedRounds)

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
        notifyMembers,
      },
    })
    await refresh()
  }

  return (
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
      <div className="overflow-hidden rounded-lg border border-border">
        {visibleCoffees.map((coffee) => (
          <button
            key={coffee.id}
            className="grid w-full gap-3 border-b border-border p-3 text-left last:border-b-0 hover:bg-muted/60 sm:grid-cols-[minmax(0,1fr)_7rem_6rem] sm:items-center"
            type="button"
            onClick={() => toggleCoffee(coffee.id)}
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
                <CoffeeHistoryLine history={coffeeHistory.get(coffee.id)} />
              </span>
            </span>
            <span className="font-mono text-sm font-semibold">
              {formatKr(coffee.priceKr)}
            </span>
            <StatusPill
              active={selectedIds.includes(coffee.id)}
              label={selectedIds.includes(coffee.id) ? "Valgt" : "Legg til"}
            />
          </button>
        ))}
      </div>
      <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-3">
        <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
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
        <label className="flex items-start gap-2 border-t border-border pt-3 text-sm">
          <input
            type="checkbox"
            className="mt-0.5"
            checked={notifyMembers}
            onChange={(event) => setNotifyMembers(event.target.checked)}
          />
          <span>
            <span className="font-medium">
              Send e-post til medlemmer ved åpning
            </span>
            <span className="mt-0.5 block text-muted-foreground">
              Sender «Ny runde åpnet»-varselet til alle aktive medlemmer med
              e-post.
            </span>
          </span>
        </label>
      </div>
    </div>
  )
}

function CoffeeHistoryLine({
  history,
}: {
  history: CoffeeOrderHistory | undefined
}) {
  if (!history || history.totalOrders === 0) {
    return (
      <span className="mt-1 block font-mono text-xs text-muted-foreground">
        Ingen tidligere bestillinger
      </span>
    )
  }

  return (
    <span className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 font-mono text-xs text-muted-foreground">
      <span>
        Forrige {history.previousOrders} ordre · {history.previousBags} poser
      </span>
      <span>
        Totalt {history.totalOrders} ordre · {history.totalBags} poser
      </span>
    </span>
  )
}

export function CatalogSection({
  dashboard,
  refresh,
}: {
  dashboard: Dashboard
  refresh: () => Promise<void>
}) {
  const [supplierId, setSupplierId] = useState(dashboard.suppliers[0]?.id ?? "")
  const [showInactive, setShowInactive] = useState(false)
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

  return (
    <section className="rounded-lg border border-(--ledger-line) bg-card">
      <div className="flex items-center justify-between gap-4 border-b border-border p-4 sm:p-5">
        <SectionTitle
          kicker="01"
          title="Kaffe"
          subtitle="Legg til, rediger og arkiver kaffelinjer."
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
              onClick={() => setSupplierId(supplier.id)}
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
            <CoffeeRow key={coffee.id} coffee={coffee} refresh={refresh} />
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
          onAdded={() => undefined}
          refresh={refresh}
        />
      </div>
    </section>
  )
}

function CoffeeRow({
  coffee,
  refresh,
}: {
  coffee: Coffee
  refresh: () => Promise<void>
}) {
  const [isEditing, setIsEditing] = useState(false)

  return (
    <div className="border-b border-border last:border-b-0">
      <div className="grid w-full gap-3 p-3 text-left sm:grid-cols-[minmax(0,1fr)_7rem_6rem] sm:items-center">
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
            active={coffee.isActive}
            label={coffee.isActive ? "Aktiv" : "Inaktiv"}
          />
        </span>
      </div>
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

export function OpenRoundSection({
  round,
  refresh,
}: {
  round: NonNullable<Dashboard["openRound"]>
  refresh: () => Promise<void>
}) {
  async function handleClose() {
    await closeRound({ data: { roundId: round.id } })
    await refresh()
  }

  return (
    <section className="rounded-lg border border-(--ledger-line) bg-card">
      <div className="flex items-center justify-between gap-4 border-b border-border p-4 sm:p-5">
        <SectionTitle
          kicker="ARKIV"
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
        <EditRoundForm round={round} mode="open" refresh={refresh} />
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

export function EditRoundForm({
  round,
  mode,
  refresh,
}: {
  round: Round
  mode: "open" | "settlement"
  refresh: () => Promise<void>
}) {
  const [closesAt, setClosesAt] = useState(formatDateTimeLocal(round.closesAt))
  const [shipping, setShipping] = useState(String(round.shippingKr))
  const [pickupInstructions, setPickupInstructions] = useState(
    round.pickupInstructions
  )
  const [saved, setSaved] = useState(false)
  const [copied, setCopied] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    await updateRoundDetails({
      data: {
        roundId: round.id,
        closesAt: closesAt ? new Date(closesAt).toISOString() : null,
        shippingKr: parseKroner(shipping),
        pickupInstructions,
      },
    })
    setSaved(true)
    window.setTimeout(() => setSaved(false), 1800)
    await refresh()
  }

  async function copyPickupInstructions() {
    await navigator.clipboard.writeText(pickupInstructions)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1800)
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-3 rounded-lg border border-border bg-muted/30 p-3"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        {mode === "open" ? (
          <label className="space-y-1">
            <span className="text-sm font-medium">Stenger (valgfritt)</span>
            <input
              className="h-9 w-full rounded-md border border-input px-3 font-mono text-sm outline-none focus-visible:border-ring"
              type="datetime-local"
              value={closesAt}
              onChange={(event) => setClosesAt(event.target.value)}
            />
          </label>
        ) : null}
        {mode === "settlement" ? (
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
        ) : null}
      </div>

      <label className="block space-y-1">
        <span className="text-sm font-medium">Henteinfo</span>
        <textarea
          className="min-h-32 w-full rounded-md border border-input px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30"
          value={pickupInstructions}
          onChange={(event) => setPickupInstructions(event.target.value)}
          placeholder="Adresse, tidspunkt og praktiske instruksjoner. Markdown støttes."
        />
      </label>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Markdown støttes. Lenker blir klikkbare på kundesiden.
        </p>
        <Button
          variant="secondary"
          size="sm"
          type="button"
          onClick={copyPickupInstructions}
        >
          <Copy className="size-4" aria-hidden="true" />
          {copied ? "Kopiert" : "Kopier henteinfo"}
        </Button>
      </div>
      <Button variant="secondary" type="submit">
        {saved ? "Lagret" : "Lagre"}
      </Button>
    </form>
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

function BulkCoffeeTotals({ orders }: { orders: Round["orders"] }) {
  const [expanded, setExpanded] = useState(getDefaultBulkOrderExpanded())
  const items = calculateCoffeeTotals(orders)
  const visibleItems = items.filter((item) => item.quantity > 0)
  const bagCount = visibleItems.reduce((sum, item) => sum + item.quantity, 0)

  if (visibleItems.length === 0) return null

  return (
    <section className="rounded-lg border border-border bg-muted/30">
      <button
        className="flex w-full items-center justify-between gap-3 p-3 text-left"
        type="button"
        onClick={() => setExpanded((value) => !value)}
      >
        <span>
          <span className="block text-lg">Samlet ordre</span>
          <span className="font-mono text-sm text-muted-foreground">
            {bagCount} poser · {visibleItems.length} kaffetyper
          </span>
        </span>
        <span className="font-mono text-sm text-muted-foreground">
          {expanded ? "Skjul" : "Detaljer"}
        </span>
      </button>
      {expanded ? (
        <div className="grid gap-2 border-t border-border p-3 sm:grid-cols-2">
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
              <span className="shrink-0 font-mono">
                {coffee.quantity} poser
              </span>
            </div>
          ))}
        </div>
      ) : null}
    </section>
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
      {orders.map((order) => (
        <ActiveOrderRow
          key={order.id}
          order={order}
          total={totalsByOrderId.get(order.id)}
          refresh={refresh}
        />
      ))}
    </div>
  )
}

function ActiveOrderRow({
  order,
  total,
  refresh,
}: {
  order: Round["orders"][number]
  total: ReturnType<typeof calculateRoundTotals>[number] | undefined
  refresh: () => Promise<void>
}) {
  const [expanded, setExpanded] = useState(getDefaultOrderExpanded())
  const bagCount =
    total?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0

  return (
    <article className="border-b border-border p-3 last:border-b-0">
      <button
        className="grid w-full gap-3 text-left sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
        type="button"
        onClick={() => setExpanded((value) => !value)}
      >
        <span>
          <span className="block text-lg">{order.customerName}</span>
          <span className="font-mono text-sm text-muted-foreground">
            {bagCount} poser · {formatKr(total?.totalKr ?? 0)}
          </span>
        </span>
        <span className="self-center justify-self-start font-mono text-sm text-muted-foreground sm:justify-self-end">
          {expanded ? "Skjul" : "Detaljer"}
        </span>
      </button>
      {expanded ? (
        <div className="mt-3 border-t border-border pt-3">
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
            className="mt-3"
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
      ) : null}
    </article>
  )
}

export function CustomersSection({
  customers,
  highlightedCustomerId,
  refresh,
}: {
  customers: Dashboard["customers"]
  highlightedCustomerId?: string
  refresh?: () => Promise<void> | void
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
            id={`customer-${customer.id}`}
            key={customer.id}
            className={getCustomerRowClasses(
              customer.id,
              highlightedCustomerId
            )}
          >
            <div>
              <p className="font-medium">{customer.name}</p>
              <p className="font-mono text-xs text-muted-foreground">
                Registrert {formatDate(customer.createdAt)}
              </p>
            </div>
            <a
              className="font-mono text-sm underline-offset-4 hover:text-foreground hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/30 focus-visible:outline-none"
              href={getCustomerPhoneHref(customer.phone)}
            >
              {customer.phone}
            </a>
            <a
              className="truncate font-mono text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/30 focus-visible:outline-none"
              href={getCustomerEmailHref(customer.email)}
            >
              {customer.email}
            </a>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <StatusPill
                active={customer.role === "admin"}
                label={customer.role === "admin" ? "Admin" : "Medlem"}
              />
              <StatusPill
                active={customer.isActive}
                label={customer.isActive ? "Aktiv" : "Inaktiv"}
              />
              {refresh ? (
                <CustomerAdminControls customer={customer} refresh={refresh} />
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

function CustomerAdminControls({
  customer,
  refresh,
}: {
  customer: Dashboard["customers"][number]
  refresh: () => Promise<void> | void
}) {
  const [isBusy, setIsBusy] = useState(false)

  async function run(action: () => Promise<unknown>) {
    setIsBusy(true)
    try {
      await action()
      await refresh()
    } finally {
      setIsBusy(false)
    }
  }

  return (
    <div className="flex items-center gap-1.5">
      <Button
        variant="outline"
        size="xs"
        disabled={isBusy}
        onClick={() =>
          run(() =>
            setCustomerRole({
              data: {
                customerId: customer.id,
                role: customer.role === "admin" ? "member" : "admin",
              },
            })
          )
        }
      >
        {customer.role === "admin" ? "Fjern admin" : "Gjør admin"}
      </Button>
      <Button
        variant="outline"
        size="xs"
        disabled={isBusy}
        onClick={() =>
          run(() =>
            setCustomerActive({
              data: {
                customerId: customer.id,
                isActive: !customer.isActive,
              },
            })
          )
        }
      >
        {customer.isActive ? "Deaktiver" : "Aktiver"}
      </Button>
    </div>
  )
}

function RoundsCardList({
  currentRound,
  closedRounds,
}: {
  currentRound: Dashboard["openRound"]
  closedRounds: Dashboard["closedRounds"]
}) {
  const rounds = currentRound ? [currentRound, ...closedRounds] : closedRounds
  const { latestRound, archivedRounds } = getRoundArchiveSections(rounds)

  return (
    <section id="admin-runder" className="space-y-3">
      <div className="flex items-center justify-between gap-4">
        <SectionTitle title="Innkjøpsrunder" subtitle="Siste runde øverst" />
        <span className="font-mono text-xs text-muted-foreground">
          {rounds.length} runder
        </span>
      </div>

      {latestRound ? (
        <LatestRoundCard round={latestRound} />
      ) : (
        <p className="rounded-lg border border-(--ledger-line) bg-card p-4 text-sm text-muted-foreground">
          Ingen runder ennå.
        </p>
      )}

      {archivedRounds.length > 0 ? (
        <section className="overflow-hidden rounded-lg border border-(--ledger-line) bg-card">
          <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
            <h3 className="font-mono text-xs tracking-[0.18em] text-muted-foreground uppercase">
              Arkiv
            </h3>
            <span className="font-mono text-xs text-muted-foreground">
              {archivedRounds.length} eldre
            </span>
          </div>
          <div className="divide-y divide-border">
            {archivedRounds.map((round) => (
              <ArchiveRoundLine key={round.id} round={round} />
            ))}
          </div>
        </section>
      ) : null}
    </section>
  )
}

function LatestRoundCard({ round }: { round: Round }) {
  const summary = summarizeAdminRound(round)

  return (
    <Link
      to="/admin/runder/$roundId"
      params={{ roundId: round.id }}
      className="block rounded-lg border border-(--ledger-line) bg-card p-4 transition-colors hover:bg-muted/25 focus-visible:ring-[3px] focus-visible:ring-ring/30 focus-visible:outline-none sm:p-5"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="font-mono text-xs tracking-[0.18em] text-muted-foreground uppercase">
            Siste runde
          </p>
          <h3 className="mt-1 truncate text-xl font-semibold tracking-tight">
            {summary.supplierName}
          </h3>
          <p className="mt-1 font-mono text-sm text-muted-foreground">
            {formatDate(summary.date)}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <StatusPill
            active={round.status === "open"}
            label={summary.statusLabel}
          />
          <ArrowRight
            className="size-4 text-muted-foreground"
            aria-hidden="true"
          />
        </div>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Meta label="Ordre" value={summary.orderCount} />
        <Meta label="Poser" value={summary.bagCount} />
        <Meta
          label="Betalt"
          value={`${summary.paidCount}/${summary.orderCount}`}
        />
        <Meta
          label="Hentet"
          value={`${summary.collectedCount}/${summary.orderCount}`}
        />
      </div>
    </Link>
  )
}

function ArchiveRoundLine({ round }: { round: Round }) {
  const summary = summarizeAdminRound(round)

  return (
    <Link
      to="/admin/runder/$roundId"
      params={{ roundId: round.id }}
      className="grid gap-3 px-4 py-3 transition-colors hover:bg-muted/25 focus-visible:ring-[3px] focus-visible:ring-ring/30 focus-visible:outline-none sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center"
    >
      <div className="min-w-0">
        <p className="truncate font-medium">{summary.supplierName}</p>
        <p className="mt-0.5 font-mono text-xs text-muted-foreground">
          {formatDate(summary.date)}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2 font-mono text-xs text-muted-foreground">
        <span>{summary.orderCount} ordre</span>
        <span>{summary.bagCount} poser</span>
        <span>
          {summary.paidCount}/{summary.orderCount} betalt
        </span>
        <span>
          {summary.collectedCount}/{summary.orderCount} hentet
        </span>
      </div>
      <div className="flex items-center gap-2 sm:justify-self-end">
        <StatusPill
          active={round.status === "open"}
          label={summary.statusLabel}
        />
        <ArrowRight
          className="size-4 text-muted-foreground"
          aria-hidden="true"
        />
      </div>
    </Link>
  )
}

function AdminIndexLinks({ dashboard }: { dashboard: Dashboard }) {
  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Link
        to="/admin/kaffe"
        className="rounded-lg border border-(--ledger-line) bg-card p-4 hover:bg-muted/30"
      >
        <p className="font-mono text-xs tracking-[0.18em] text-muted-foreground uppercase">
          Katalog
        </p>
        <h2 className="mt-1 flex items-center justify-between gap-3 text-lg">
          <span>Kaffe</span>
          <ArrowRight
            className="size-4 text-muted-foreground"
            aria-hidden="true"
          />
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {dashboard.coffees.length} varer. Legg til, rediger og arkiver kaffe.
        </p>
      </Link>
      <Link
        to="/admin/kunder"
        search={{ customer: undefined }}
        className="rounded-lg border border-(--ledger-line) bg-card p-4 hover:bg-muted/30"
      >
        <p className="font-mono text-xs tracking-[0.18em] text-muted-foreground uppercase">
          Tilgang
        </p>
        <h2 className="mt-1 flex items-center justify-between gap-3 text-lg">
          <span>Kunder</span>
          <ArrowRight
            className="size-4 text-muted-foreground"
            aria-hidden="true"
          />
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {dashboard.customers.length} registrerte personer.
        </p>
      </Link>
      <Link
        to="/admin/epost"
        className="rounded-lg border border-(--ledger-line) bg-card p-4 hover:bg-muted/30"
      >
        <p className="font-mono text-xs tracking-[0.18em] text-muted-foreground uppercase">
          Utsending
        </p>
        <h2 className="mt-1 flex items-center justify-between gap-3 text-lg">
          <span>E-post</span>
          <ArrowRight
            className="size-4 text-muted-foreground"
            aria-hidden="true"
          />
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Test maler og send meldinger til medlemmer.
        </p>
      </Link>
    </section>
  )
}

export function ClosedRoundSummary({
  round,
  refresh,
}: {
  round: Dashboard["closedRounds"][number]
  refresh: () => Promise<void>
}) {
  const totals = calculateRoundTotals({
    shippingKr: round.shippingKr,
    orders: round.orders,
  })
  const grandTotals = calculateRoundGrandTotals({
    shippingKr: round.shippingKr,
    orders: round.orders,
  })
  const isReady = round.status === "ready"

  return (
    <div className="space-y-4">
      <div className="grid gap-3 rounded-lg border border-border bg-muted/30 p-3 text-sm sm:grid-cols-5">
        <Meta label="Status" value={isReady ? "Klar for henting" : "På vei"} />
        <div className="sm:col-span-2">
          <Meta label="Leverandør" value={round.supplier?.name ?? "Ukjent"} />
        </div>
        <Meta label="Åpnet" value={formatDate(round.openedAt)} />
        <Meta label="Lukket" value={formatDate(round.closedAt)} />

        <div className="h-px bg-border sm:col-span-5" />

        <Meta label="Ordre" value={round.orders.length} />
        <Meta label="Poser" value={grandTotals.bagCount} />
        <Meta label="Kaffe" value={formatKr(grandTotals.coffeeSubtotalKr)} />
        <Meta label="Frakt" value={formatKr(round.shippingKr)} />
        <Meta label="Totalt" value={formatKr(grandTotals.totalKr)} />
      </div>

      <BulkCoffeeTotals orders={round.orders} />

      <div className="overflow-hidden rounded-lg border border-border">
        {sortAdminOrderTotals(totals).map((total) => (
          <ClosedOrderRow key={total.orderId} total={total} refresh={refresh} />
        ))}
      </div>
    </div>
  )
}

function CustomerOrderNameLink({
  customerId,
  customerName,
  className,
}: {
  customerId?: string
  customerName: string
  className?: string
}) {
  if (!customerId) return <span className={className}>{customerName}</span>

  return (
    <Link
      to="/admin/kunder"
      search={{ customer: customerId }}
      className={`${className ?? ""} rounded-sm underline-offset-4 hover:text-foreground hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/30 focus-visible:outline-none`}
    >
      {customerName}
    </Link>
  )
}

function ClosedOrderRow({
  total,
  refresh,
}: {
  total: ReturnType<typeof calculateRoundTotals>[number]
  refresh: () => Promise<void>
}) {
  const [copied, setCopied] = useState(false)
  const bagCount = total.items.reduce(
    (sum, item) => sum + Math.max(0, item.quantity),
    0
  )
  const moneyRows = getOrderMoneyDetailRows(total)

  async function copyPaymentLink() {
    const link = `${window.location.origin}/bestilling/${total.orderId}`
    await navigator.clipboard.writeText(link)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1800)
  }

  return (
    <article className="relative border-b border-border bg-card/40 p-3 last:border-b-0">
      <div className="grid gap-3 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center">
        <div className="flex flex-wrap items-center gap-2 sm:max-w-40">
          <PaymentStatusPill checked={total.paid} />
          <PickupStatusPill checked={total.collected} />
        </div>

        <div className="min-w-0">
          <CustomerOrderNameLink
            customerId={total.customerId}
            customerName={total.customerName}
            className="font-semibold"
          />
          <p className="font-mono text-sm text-muted-foreground">
            {bagCount} poser {formatKr(total.totalKr)}
          </p>
          {total.pickupSlotLabel ? (
            <p className="mt-1 text-sm text-muted-foreground">
              Henting: {total.pickupSlotLabel}
            </p>
          ) : null}
        </div>

        <div className="flex items-center gap-2 sm:justify-self-end">
          <Dialog>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={<Button variant="outline" size="sm" />}
              >
                <MoreHorizontal className="size-4" />
                Handlinger
                <ChevronDown className="size-3" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-56">
                <DialogTrigger render={<DropdownMenuItem />}>
                  Detaljer
                </DialogTrigger>
                <DropdownMenuItem
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
                  {total.paid ? "Merk som ikke betalt" : "Merk som betalt"}
                </DropdownMenuItem>
                <DropdownMenuItem
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
                  {total.collected ? "Merk som ikke hentet" : "Merk som hentet"}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={copyPaymentLink}>
                  {copied ? "Kopiert" : "Kopier bestillingslenke"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <DialogContent>
              <DialogHeader>
                <p className="font-mono text-xs tracking-[0.18em] text-muted-foreground uppercase">
                  Ordre
                </p>
                <DialogTitle>Detaljer</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <p className="font-semibold">{total.customerName}</p>
                  <p className="mt-1 font-mono text-sm text-muted-foreground">
                    {bagCount} poser
                  </p>
                </div>
                <dl className="divide-y divide-border rounded-lg border border-border bg-muted/20 font-mono text-sm">
                  {moneyRows.map((row) => (
                    <div
                      key={row.label}
                      className="flex items-center justify-between gap-4 px-3 py-2.5"
                    >
                      <dt className="text-muted-foreground">{row.label}</dt>
                      <dd
                        className={
                          row.emphasis
                            ? "font-semibold text-foreground"
                            : "text-foreground"
                        }
                      >
                        {row.value}
                      </dd>
                    </div>
                  ))}
                </dl>
                {total.pickupSlotLabel ? (
                  <p className="rounded-md border border-border bg-card px-3 py-2 text-sm text-muted-foreground">
                    Henting:{" "}
                    <span className="font-medium text-foreground">
                      {total.pickupSlotLabel}
                    </span>
                  </p>
                ) : null}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </article>
  )
}

function SectionTitle({
  kicker,
  title,
  subtitle,
}: {
  kicker?: string
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
    <span className={getOrderStatusPillClasses("payment", checked)}>
      {checked ? <Check className="size-3" /> : <Circle className="size-3" />}
      {checked ? "Betalt" : "Ikke betalt"}
    </span>
  )
}

function PickupStatusPill({ checked }: { checked: boolean }) {
  return (
    <span className={getOrderStatusPillClasses("pickup", checked)}>
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
