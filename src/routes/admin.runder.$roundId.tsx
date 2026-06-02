import { Link, createFileRoute, useRouter } from "@tanstack/react-router"
import {
  AdminHeader,
  AdminPasswordForm,
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
import { getAdminRoundDetail, markRoundReadyForPickup } from "@/server/coffee"


export const Route = createFileRoute("/admin/runder/$roundId")({
  loader: ({ params }) =>
    getAdminRoundDetail({ data: { roundId: params.roundId } }),
  component: AdminRoundDetailPage,
})

function AdminRoundDetailPage() {
  const data = Route.useLoaderData()
  const router = useRouter()

  return (
    <main className="min-h-svh px-4 py-5 text-foreground sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-7xl space-y-5">
        <AdminHeader />
        <Link
          to="/admin"
          className="inline-flex rounded-md border border-border px-3 py-2 text-sm font-medium hover:bg-muted/60"
        >
          Tilbake til admin
        </Link>
        {!data.unlocked ? (
          <AdminPasswordForm onUnlocked={() => router.invalidate()} />
        ) : null}
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
                    {data.round.closedAt ? ` ${new Date(data.round.closedAt).toLocaleDateString("nb-NO", { dateStyle: "medium" })}` : ""}
                  </h1>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Full oppgjørsd"etalj med ordre lukket som standard.
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
              <div className="p-4 sm:p-5">
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
