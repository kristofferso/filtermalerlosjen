import { useState } from "react"
import {
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
import { BRAND_NAME } from "@/components/brand"
import { Button } from "@/components/ui/button"
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
  sortAdminOrderTotals,
  summarizeAdminRound,
} from "@/lib/admin-rounds"
import { formatKr, parseKroner } from "@/lib/money"
import { getOrderStatusPillClasses } from "@/lib/admin-order-row-ui"
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
  openRound,
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

export function AdminHeader() {
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

export function AdminPasswordForm({
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
  const items = getAdminActionQueue({
    openRound: dashboard.openRound,
    closedRounds: dashboard.closedRounds,
  })

  return (
    <aside className="space-y-3 lg:sticky lg:top-5">
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
                className={`mt-1 text-sm font-medium ${item.tone === "attention" ? "text-destructive" : ""
                  }`}
              >
                {item.value}
              </p>
            </div>
          ))}
        </div>
      </section>
    </aside>
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
          kicker="START"
          title="Ny runde"
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
  const selectedSupplier =
    dashboard.suppliers.find((supplier) => supplier.id === supplierId) ??
    dashboard.suppliers[0]
  const visibleCoffees = dashboard.coffees.filter(
    (coffee) => coffee.supplierId === selectedSupplier.id && coffee.isActive
  )

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
            {bagCount} poser · {visibleItems.length} kaffe
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

function RoundsCardList({
  currentRound,
  closedRounds,
}: {
  currentRound: Dashboard["openRound"]
  closedRounds: Dashboard["closedRounds"]
}) {
  const rounds = currentRound ? [currentRound, ...closedRounds] : closedRounds

  return (
    <section
      id="admin-runder"
      className="rounded-lg border border-(--ledger-line) bg-card"
    >
      <div className="flex items-center justify-between gap-4 border-b border-border p-4 sm:p-5">
        <SectionTitle
          kicker="02"
          title="Runder"
          subtitle="Alle runder som kompakte kort. Åpne detaljer ved behov."
        />
        <span className="font-mono text-xs text-muted-foreground">
          {rounds.length} runder
        </span>
      </div>
      <div className="grid gap-3 p-4 sm:grid-cols-2 sm:p-5 xl:grid-cols-3">
        {rounds.length === 0 ? (
          <p className="text-sm text-muted-foreground">Ingen runder ennå.</p>
        ) : null}
        {rounds.map((round) => (
          <RoundCard key={round.id} round={round} />
        ))}
      </div>
    </section>
  )
}

function RoundCard({ round }: { round: Round }) {
  const summary = summarizeAdminRound(round)

  return (
    <Link
      to="/admin/runder/$roundId"
      params={{ roundId: round.id }}
      className="rounded-lg border border-border bg-muted/20 p-3 transition-colors hover:bg-muted/50 focus-visible:ring-[3px] focus-visible:ring-ring/30 focus-visible:outline-none"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-medium">{summary.supplierName}</p>
          <p className="mt-1 font-mono text-xs text-muted-foreground">
            {formatDate(summary.date)}
          </p>
        </div>
        <StatusPill
          active={round.status === "open"}
          label={summary.statusLabel}
        />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
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

function AdminIndexLinks({ dashboard }: { dashboard: Dashboard }) {
  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Link
        to="/admin/kaffe"
        className="rounded-lg border border-(--ledger-line) bg-card p-4 hover:bg-muted/30"
      >
        <p className="font-mono text-xs tracking-[0.18em] text-muted-foreground uppercase">
          Arkiv
        </p>
        <h2 className="mt-1 text-lg">Kaffekatalog</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {dashboard.coffees.length} varer. Legg til, rediger og arkiver kaffe.
        </p>
      </Link>
      <Link
        to="/admin/kunder"
        className="rounded-lg border border-(--ledger-line) bg-card p-4 hover:bg-muted/30"
      >
        <p className="font-mono text-xs tracking-[0.18em] text-muted-foreground uppercase">
          Tilgang
        </p>
        <h2 className="mt-1 text-lg">Kunder</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {dashboard.customers.length} registrerte personer.
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

      <BulkCoffeeTotals orders={round.orders} />

      <div className="overflow-hidden rounded-lg border border-border">
        {sortAdminOrderTotals(totals).map((total) => (
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
  const [expanded, setExpanded] = useState(getDefaultOrderExpanded())
  const [copied, setCopied] = useState(false)

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
          <p className="font-semibold">{total.customerName}</p>
          <p className="font-mono text-sm text-muted-foreground">
            {total.items.reduce((sum, item) => sum + item.quantity, 0)} poser{" "}
            {formatKr(total.totalKr)}
          </p>
          {total.pickupSlotLabel ? (
            <p className="mt-1 text-sm text-muted-foreground">
              Henting: {total.pickupSlotLabel}
            </p>
          ) : null}
        </div>

        <div className="flex items-center gap-2 sm:justify-self-end">
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="outline" size="sm" />}>
              <MoreHorizontal className="size-4" />
              Handlinger
              <ChevronDown className="size-3" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-56">
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
          <Button
            variant="secondary"
            size="sm"
            type="button"
            aria-expanded={expanded}
            onClick={() => setExpanded((value) => !value)}
          >
            {expanded ? "Skjul" : "Detaljer"}
          </Button>
        </div>
      </div>

      {expanded ? (
        <div className="mt-3 border-t border-border pt-3">
          <CoffeeQuantitySection
            title={`Hentes av ${total.customerName}`}
            items={total.items}
            compact
          />
          {total.pickupSlotLabel ? (
            <p className="mt-3 rounded-md border border-border bg-muted/30 px-3 py-2 text-sm">
              Henting:{" "}
              <span className="font-medium">{total.pickupSlotLabel}</span>
            </p>
          ) : null}
          <div className="mt-3 grid gap-1 font-mono text-sm">
            <p>Kaffe: {formatKr(total.coffeeSubtotalKr)}</p>
            <p>Frakt: {formatKr(total.shippingShareKr)}</p>
            <p className="font-semibold">Totalt: {formatKr(total.totalKr)}</p>
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
