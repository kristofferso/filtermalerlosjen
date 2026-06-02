import { Link, createFileRoute, useRouter } from "@tanstack/react-router"
import { AdminHeader, AdminPasswordForm, CustomersSection } from "./admin"
import { getAdminDashboard } from "@/server/coffee"

export const Route = createFileRoute("/admin/kunder")({
  loader: () => getAdminDashboard(),
  component: AdminCustomersPage,
})

function AdminCustomersPage() {
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
        {data.unlocked ? <CustomersSection customers={data.customers} /> : null}
      </div>
    </main>
  )
}
