import { Link, createFileRoute, useNavigate, useRouter } from "@tanstack/react-router"
import { ChevronDown, X } from "lucide-react"
import { AdminAccessNotice } from "./admin"
import { AdminPickupMode } from "@/components/admin-pickup-mode"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { sortAdminOrderTotals } from "@/lib/admin-rounds"
import { calculateRoundTotals } from "@/lib/order-totals"
import { getAdminRoundDetail } from "@/server/coffee"

export const Route = createFileRoute("/admin/runder/$roundId/hentemodus")({
  validateSearch: (search): { order?: string } => ({
    order: typeof search.order === "string" ? search.order : undefined,
  }),
  loader: ({ params }) =>
    getAdminRoundDetail({ data: { roundId: params.roundId } }),
  component: AdminPickupModePage,
})

function AdminPickupModePage() {
  const data = Route.useLoaderData()
  const search = Route.useSearch()
  const params = Route.useParams()
  const router = useRouter()
  const navigate = useNavigate()

  const totals =
    data.unlocked && data.round
      ? sortAdminOrderTotals(
          calculateRoundTotals({
            shippingKr: data.round.shippingKr,
            orders: data.round.orders,
          })
        )
      : []
  const selectableOrders = totals.filter((order) => !order.collected)
  const selectedOrder =
    selectableOrders.find((order) => order.orderId === search.order) ??
    selectableOrders.at(0) ??
    null

  async function refreshAfterPickup() {
    await router.invalidate()
    const nextOrder = selectableOrders.find(
      (order) => order.orderId !== selectedOrder?.orderId
    )
    await navigate({
      to: "/admin/runder/$roundId/hentemodus",
      params: { roundId: params.roundId },
      search: { order: nextOrder?.orderId },
      replace: true,
    })
  }

  return (
    <main className="min-h-svh text-foreground">
      {!data.unlocked ? (
        <div className="p-4 sm:p-6 lg:p-8">
          <AdminAccessNotice />
        </div>
      ) : null}
      {data.unlocked && !data.round ? (
        <section className="m-4 rounded-lg border border-(--ledger-line) bg-card p-5 sm:m-6 lg:m-8">
          <h1 className="text-xl">Runde finnes ikke</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Kontroller lenken eller gå tilbake til admin.
          </p>
        </section>
      ) : null}
      {data.unlocked && data.round ? (
        selectedOrder ? (
          <AdminPickupMode
            order={selectedOrder}
            onCollected={refreshAfterPickup}
            actions={
              <div className="flex items-center gap-2">
                <PickupCustomerSelector
                  roundId={params.roundId}
                  orders={selectableOrders}
                  selectedOrderId={selectedOrder.orderId}
                />
                <Link
                  to="/admin/runder/$roundId"
                  params={{ roundId: params.roundId }}
                  className="inline-flex h-9 items-center justify-center rounded-md border border-border px-3 text-sm font-medium hover:bg-muted/60 focus-visible:ring-[3px] focus-visible:ring-ring/30 focus-visible:outline-none"
                  aria-label="Gå til runden"
                >
                  <X className="size-4" aria-hidden="true" />
                </Link>
              </div>
            }
          />
        ) : (
          <section className="m-4 rounded-lg border border-(--ledger-line) bg-card p-5 sm:m-6 lg:m-8">
            <h2 className="text-xl">Ingen åpne hentinger</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Alle ordre i denne runden er markert som hentet.
            </p>
          </section>
        )
      ) : null}
    </main>
  )
}

function PickupCustomerSelector({
  roundId,
  orders,
  selectedOrderId,
}: {
  roundId: string
  orders: Array<ReturnType<typeof calculateRoundTotals>[number]>
  selectedOrderId?: string
}) {
  const selectedOrder = orders.find((order) => order.orderId === selectedOrderId)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="secondary" size="sm" />}>
        {selectedOrder?.customerName ?? "Velg kunde"}
        <ChevronDown className="size-3" aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-56">
        {orders.length === 0 ? (
          <DropdownMenuItem disabled>Ingen uhentede ordre</DropdownMenuItem>
        ) : (
          orders.map((order) => (
            <DropdownMenuItem
              key={order.orderId}
              render={
                <Link
                  to="/admin/runder/$roundId/hentemodus"
                  params={{ roundId }}
                  search={{ order: order.orderId }}
                />
              }
            >
              {order.customerName}
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
