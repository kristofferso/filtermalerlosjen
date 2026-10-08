import { useMemo, useState } from "react"
import { createFileRoute, useRouter } from "@tanstack/react-router"
import { AdminAccessNotice, AdminHeader } from "./admin"
import type { Dashboard } from "./admin"
import type { ShProduct, ShSyncPlan } from "@/lib/sh-catalog"
import { Button } from "@/components/ui/button"
import {
  SH_UNUSUAL_PRICE_KR,
  buildShCoffeeDescription,
  parseShCatalogHtml,
  planShSync,
} from "@/lib/sh-catalog"
import { formatKr } from "@/lib/money"
import { getAdminDashboard, syncCatalog } from "@/server/coffee"

export const Route = createFileRoute("/admin/synk")({
  loader: () => getAdminDashboard(),
  component: AdminSyncPage,
})

type Coffee = Dashboard["coffees"][number]

function AdminSyncPage() {
  const data = Route.useLoaderData()

  return (
    <main className="min-h-svh px-4 py-5 text-foreground sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-3xl space-y-5">
        <AdminHeader />
        {!data.unlocked ? <AdminAccessNotice /> : null}
        {data.unlocked ? <SyncSection dashboard={data} /> : null}
      </div>
    </main>
  )
}

function SyncSection({ dashboard }: { dashboard: Dashboard }) {
  const router = useRouter()
  const [supplierId, setSupplierId] = useState(
    dashboard.suppliers.find((supplier) => /solberg/i.test(supplier.name))
      ?.id ??
      dashboard.suppliers.at(0)?.id ??
      ""
  )
  const [html, setHtml] = useState("")
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [status, setStatus] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const supplierCoffees = dashboard.coffees.filter(
    (coffee) => coffee.supplierId === supplierId
  )
  const catalog = useMemo(
    () => (html.trim() ? parseShCatalogHtml(html) : null),
    [html]
  )
  const plan = catalog ? planShSync(supplierCoffees, catalog.products) : null

  function loadHtml(value: string) {
    setHtml(value)
    setStatus(null)
    const nextCatalog = value.trim() ? parseShCatalogHtml(value) : null
    if (!nextCatalog) return setSelected(new Set())
    const nextPlan = planShSync(supplierCoffees, nextCatalog.products)
    setSelected(defaultSelection(nextPlan, nextCatalog.hasMore))
  }

  async function pasteFromClipboard() {
    try {
      loadHtml(await navigator.clipboard.readText())
    } catch {
      setStatus(
        "Fikk ikke lest utklippstavla. Lim inn i feltet under i stedet."
      )
    }
  }

  function toggle(key: string) {
    setSelected((current) => {
      const next = new Set(current)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  async function handleSave() {
    if (!plan) return
    setIsSaving(true)
    try {
      const result = await syncCatalog({
        data: {
          supplierId,
          deactivateIds: plan.deactivate
            .filter((coffee) => selected.has(deactivateKey(coffee)))
            .map((coffee) => coffee.id),
          updates: plan.update
            .filter((entry) => selected.has(updateKey(entry.coffee)))
            .map((entry) => ({
              id: entry.coffee.id,
              priceKr: entry.priceChanged ? entry.product.priceKr : undefined,
              imageUrl: entry.imageChanged ? entry.product.imageUrl : undefined,
              reactivate: entry.reactivate,
            })),
          creates: plan.create
            .filter((product) => selected.has(createKey(product)))
            .map((product) => ({
              name: product.name,
              description: buildShCoffeeDescription(product),
              imageUrl: product.imageUrl,
              priceKr: Math.max(1, product.priceKr),
            })),
        },
      })
      setHtml("")
      setSelected(new Set())
      setStatus(
        `Lagret: ${result.created} nye, ${result.updated} oppdatert, ${result.deactivated} deaktivert.`
      )
      await router.invalidate()
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Noe gikk galt.")
    } finally {
      setIsSaving(false)
    }
  }

  const selectedCount = plan
    ? plan.create.filter((product) => selected.has(createKey(product))).length +
      plan.update.filter((entry) => selected.has(updateKey(entry.coffee)))
        .length +
      plan.deactivate.filter((coffee) => selected.has(deactivateKey(coffee)))
        .length
    : 0

  return (
    <section className="rounded-lg border border-(--ledger-line) bg-card">
      <div className="border-b border-border p-4 sm:p-5">
        <p className="font-mono text-xs tracking-[0.18em] text-muted-foreground uppercase">
          Synk
        </p>
        <h2 className="mt-1 text-xl tracking-tight">Kaffeutvalg fra shoppen</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Åpne kaffeoversikten på b2bshop.sh.no, kjør snarveien «Kopier HTML»
          fra Del-menyen, og lim inn her.
        </p>
      </div>

      <div className="space-y-4 p-4 sm:p-5">
        <div className="flex flex-wrap gap-2">
          {dashboard.suppliers.map((supplier) => (
            <Button
              key={supplier.id}
              variant={supplier.id === supplierId ? "default" : "outline"}
              size="sm"
              type="button"
              onClick={() => {
                setSupplierId(supplier.id)
                loadHtml("")
              }}
            >
              {supplier.name}
            </Button>
          ))}
        </div>

        <div className="space-y-2">
          <Button
            className="w-full sm:w-auto"
            size="lg"
            type="button"
            onClick={pasteFromClipboard}
          >
            Lim inn fra utklippstavla
          </Button>
          <textarea
            className="h-24 w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30"
            value={html}
            onChange={(event) => loadHtml(event.target.value)}
            placeholder="…eller lim inn HTML-en her"
          />
        </div>

        {status ? (
          <p className="rounded-md border border-border bg-muted/40 p-3 text-sm">
            {status}
          </p>
        ) : null}

        {catalog && catalog.products.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Fant ingen produkter i teksten. Er det HTML fra kaffeoversikten?
          </p>
        ) : null}

        {catalog && plan && catalog.products.length > 0 ? (
          <>
            <p className="text-sm text-muted-foreground">
              Fant {catalog.products.length} produkter i shoppen.{" "}
              {plan.unchanged.length} er uendret.
            </p>

            {catalog.hasMore ? (
              <p className="rounded-md border border-amber-500/60 bg-amber-500/10 p-3 text-sm">
                Siden har knappen «Vis flere produkter», så lista kan være
                ufullstendig. Trykk på den i shoppen til alt er lastet og kopier
                på nytt. Deaktivering er ikke forhåndsvalgt.
              </p>
            ) : null}

            <SyncGroup
              title="Nye i shoppen"
              hint={`Legges til som aktive. Over ${SH_UNUSUAL_PRICE_KR} kr er neppe 250 g og er ikke forhåndsvalgt.`}
              empty="Ingen nye kaffer."
            >
              {plan.create.map((product) => (
                <SyncRow
                  key={createKey(product)}
                  checked={selected.has(createKey(product))}
                  onToggle={() => toggle(createKey(product))}
                  imageUrl={product.imageUrl}
                  name={product.name}
                  detail={[product.subtitle, product.badge]
                    .filter(Boolean)
                    .join(" · ")}
                  value={formatKr(product.priceKr)}
                  warning={
                    product.priceKr > SH_UNUSUAL_PRICE_KR
                      ? "Sjekk pakningsstørrelse"
                      : null
                  }
                />
              ))}
            </SyncGroup>

            <SyncGroup
              title="Borte fra shoppen"
              hint="Settes til inaktive. De kan aktiveres igjen senere."
              empty="Alle aktive kaffer finnes i shoppen."
            >
              {plan.deactivate.map((coffee) => (
                <SyncRow
                  key={deactivateKey(coffee)}
                  checked={selected.has(deactivateKey(coffee))}
                  onToggle={() => toggle(deactivateKey(coffee))}
                  imageUrl={coffee.imageUrl}
                  name={coffee.name}
                  detail="Ikke funnet i shoppen"
                  value={formatKr(coffee.priceKr)}
                />
              ))}
            </SyncGroup>

            <SyncGroup
              title="Endret"
              hint="Pris, bilde eller tilbake i shoppen."
              empty="Ingen endringer på eksisterende kaffer."
            >
              {plan.update.map((entry) => (
                <SyncRow
                  key={updateKey(entry.coffee)}
                  checked={selected.has(updateKey(entry.coffee))}
                  onToggle={() => toggle(updateKey(entry.coffee))}
                  imageUrl={entry.product.imageUrl || entry.coffee.imageUrl}
                  name={entry.coffee.name}
                  detail={describeUpdate(entry)}
                  value={formatKr(entry.product.priceKr)}
                />
              ))}
            </SyncGroup>

            <Button
              className="w-full"
              size="lg"
              type="button"
              disabled={selectedCount === 0 || isSaving}
              onClick={handleSave}
            >
              {isSaving ? "Lagrer…" : `Lagre ${selectedCount} endringer`}
            </Button>
          </>
        ) : null}
      </div>
    </section>
  )
}

function SyncGroup({
  title,
  hint,
  empty,
  children,
}: {
  title: string
  hint: string
  empty: string
  children: Array<React.ReactNode>
}) {
  return (
    <div className="space-y-2">
      <div>
        <h3 className="text-sm font-semibold">
          {title}{" "}
          <span className="font-mono text-muted-foreground">
            {children.length}
          </span>
        </h3>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>
      {children.length > 0 ? (
        <div className="overflow-hidden rounded-lg border border-border">
          {children}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">{empty}</p>
      )}
    </div>
  )
}

function SyncRow({
  checked,
  onToggle,
  imageUrl,
  name,
  detail,
  value,
  warning,
}: {
  checked: boolean
  onToggle: () => void
  imageUrl: string
  name: string
  detail: string
  value: string
  warning?: string | null
}) {
  return (
    <label className="flex cursor-pointer items-center gap-3 border-b border-border p-3 last:border-b-0 hover:bg-muted/60">
      <input type="checkbox" checked={checked} onChange={onToggle} />
      {imageUrl ? (
        <img
          className="size-11 shrink-0 rounded-md object-cover"
          src={imageUrl}
          alt=""
          loading="lazy"
        />
      ) : (
        <span className="size-11 shrink-0 rounded-md border border-border bg-muted" />
      )}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold">{name}</span>
        <span className="block truncate text-sm text-muted-foreground">
          {detail}
        </span>
        {warning ? (
          <span className="block text-xs text-amber-700 dark:text-amber-400">
            {warning}
          </span>
        ) : null}
      </span>
      <span className="shrink-0 font-mono text-sm font-semibold">{value}</span>
    </label>
  )
}

function describeUpdate(entry: ShSyncPlan<Coffee>["update"][number]) {
  return [
    entry.reactivate ? "Tilbake i shoppen" : null,
    entry.priceChanged
      ? `Pris ${formatKr(entry.coffee.priceKr)} → ${formatKr(entry.product.priceKr)}`
      : null,
    entry.imageChanged ? "Nytt bilde" : null,
  ]
    .filter(Boolean)
    .join(" · ")
}

function defaultSelection(plan: ShSyncPlan<Coffee>, hasMore: boolean) {
  const keys = new Set<string>()
  for (const product of plan.create) {
    if (product.priceKr <= SH_UNUSUAL_PRICE_KR) keys.add(createKey(product))
  }
  for (const entry of plan.update) keys.add(updateKey(entry.coffee))
  if (!hasMore) {
    for (const coffee of plan.deactivate) keys.add(deactivateKey(coffee))
  }
  return keys
}

const createKey = (product: ShProduct) => `create:${product.productPath}`
const updateKey = (coffee: Coffee) => `update:${coffee.id}`
const deactivateKey = (coffee: Coffee) => `deactivate:${coffee.id}`
