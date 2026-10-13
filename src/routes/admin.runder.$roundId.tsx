import {
  Link,
  Outlet,
  createFileRoute,
  useLocation,
  useRouter,
} from "@tanstack/react-router"
import { useState } from "react"
import { AlertTriangle, ChevronDown, Mail } from "lucide-react"
import {
  AdminAccessNotice,
  AdminHeader,
  ClosedRoundSummary,
  EditRoundForm,
  OpenRoundSection,
} from "./admin"
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
import { formatKr } from "@/lib/money"
import {
  getAdminRoundDetail,
  markRoundReadyForPickup,
  sendRoundPaymentNotice,
} from "@/server/coffee"

type AdminRoundDetailData = Extract<
  Awaited<ReturnType<typeof getAdminRoundDetail>>,
  { unlocked: true }
>
type AdminRoundDetailRound = NonNullable<AdminRoundDetailData["round"]>

export const Route = createFileRoute("/admin/runder/$roundId")({
  loader: ({ params }) =>
    getAdminRoundDetail({ data: { roundId: params.roundId } }),
  component: AdminRoundDetailPage,
})

function PickupModeTopAction({ round }: { round: AdminRoundDetailRound }) {
  const uncollectedOrders = round.orders
    .filter((order) => !order.collected)
    .sort((left, right) =>
      left.customerName.localeCompare(right.customerName, "nb-NO")
    )

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="secondary" type="button" />}
        disabled={uncollectedOrders.length === 0}
      >
        Hentemodus
        <ChevronDown className="size-3" aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-56">
        {uncollectedOrders.length === 0 ? (
          <DropdownMenuItem disabled>Alle er hentet</DropdownMenuItem>
        ) : (
          uncollectedOrders.map((order) => (
            <DropdownMenuItem
              key={order.id}
              render={
                <Link
                  to="/admin/runder/$roundId/hentemodus"
                  params={{ roundId: round.id }}
                  search={{ order: order.id }}
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

function PaymentNoticePanel({
  round,
  refresh,
}: {
  round: AdminRoundDetailRound
  refresh: () => Promise<void>
}) {
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const recipientCount = round.orders.filter((order) =>
    order.customerEmail?.trim()
  ).length
  const missingShipping = round.shippingKr === 0
  const sentAt = round.paymentNotifiedAt
    ? new Intl.DateTimeFormat("nb-NO", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Europe/Oslo",
      }).format(new Date(round.paymentNotifiedAt))
    : null

  async function handleSend() {
    const question = [
      sentAt
        ? `Oppgjøret ble sendt ${sentAt}. Sende på nytt til ${recipientCount}?`
        : `Sende oppgjør til ${recipientCount}?`,
      missingShipping
        ? "Frakt er 0 kr, så beløpene blir uten frakt."
        : `Frakt: ${formatKr(round.shippingKr)}.`,
    ].join("\n\n")
    if (!window.confirm(question)) return

    setSending(true)
    setError(null)
    try {
      await sendRoundPaymentNotice({ data: { roundId: round.id } })
      await refresh()
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "Ukjent feil")
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium">Oppgjør på e-post</p>
          <p className="text-sm text-muted-foreground">
            {sentAt
              ? `Sendt ${sentAt}.`
              : "Ikke sendt. Legg inn frakt under «Rediger runde» først."}
          </p>
        </div>
        <Button
          type="button"
          variant={sentAt ? "outline" : "default"}
          onClick={handleSend}
          loading={sending}
          disabled={recipientCount === 0}
        >
          <Mail className="size-4" aria-hidden="true" />
          {sentAt
            ? "Send oppgjør på nytt"
            : `Send oppgjør til ${recipientCount}`}
        </Button>
      </div>
      {missingShipping ? (
        <p className="flex items-start gap-2 text-sm text-destructive">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          Frakt er 0 kr. Beløpene i e-posten blir uten fraktandel.
        </p>
      ) : null}
      {error ? (
        <p className="text-sm text-destructive">Feil ved sending: {error}</p>
      ) : null}
    </div>
  )
}

function AdminRoundDetailPage() {
  const data = Route.useLoaderData()
  const params = Route.useParams()
  const location = useLocation()
  const router = useRouter()

  if (location.pathname !== `/admin/runder/${params.roundId}`) return <Outlet />

  return (
    <main className="min-h-svh px-4 py-5 text-foreground sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-7xl space-y-5">
        <AdminHeader />
        {!data.unlocked ? <AdminAccessNotice /> : null}
        {data.unlocked && !data.round ? (
          <section className="rounded-lg border border-(--ledger-line) bg-card p-5">
            <h2 className="text-xl">Runde finnes ikke</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Kontroller lenken eller gå tilbake til admin.
            </p>
          </section>
        ) : null}
        {data.unlocked && data.round ? (
          data.round.status === "open" ? (
            <OpenRoundSection
              round={data.round}
              refresh={() => router.invalidate()}
            />
          ) : (
            <section className="rounded-lg border border-(--ledger-line) bg-card">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border p-4 sm:p-5">
                <div>
                  <p className="font-mono text-xs tracking-[0.18em] text-muted-foreground uppercase">
                    Runde
                  </p>
                  <h1 className="mt-1 text-2xl tracking-tight">
                    {data.round.supplier?.name ?? "Ukjent leverandør"}
                    {" –  "}
                    {data.round.closedAt
                      ? ` ${new Date(data.round.closedAt).toLocaleDateString("nb-NO", { dateStyle: "medium" })}`
                      : ""}
                  </h1>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Alle detaljer og ordre for denne runden.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Dialog>
                    <DialogTrigger render={<Button variant="secondary" />}>
                      Rediger runde
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>Rediger runde</DialogTitle>
                      </DialogHeader>
                      <EditRoundForm
                        round={data.round}
                        mode="settlement"
                        refresh={() => router.invalidate()}
                      />
                    </DialogContent>
                  </Dialog>
                  {data.round.status === "ready" ? (
                    <PickupModeTopAction round={data.round} />
                  ) : null}
                  <Button
                    type="button"
                    disabled={data.round.status === "ready"}
                    onClick={async () => {
                      await markRoundReadyForPickup({
                        data: { roundId: data.round.id },
                      })
                      await router.invalidate()
                    }}
                  >
                    {data.round.status === "ready"
                      ? "Klar for henting"
                      : "Merk klar for henting"}
                  </Button>
                </div>
              </div>
              <div className="space-y-4 p-4 sm:p-5">
                <PaymentNoticePanel
                  round={data.round}
                  refresh={() => router.invalidate()}
                />
                <ClosedRoundSummary
                  round={data.round}
                  refresh={() => router.invalidate()}
                />
              </div>
            </section>
          )
        ) : null}
      </div>
    </main>
  )
}
