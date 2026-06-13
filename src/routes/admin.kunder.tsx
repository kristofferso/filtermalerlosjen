import { createFileRoute, useRouter } from "@tanstack/react-router"
import { AdminAccessNotice, AdminHeader, CustomersSection } from "./admin"
import { getAdminDashboard } from "@/server/coffee"

export const Route = createFileRoute("/admin/kunder")({
  validateSearch: (search) => ({
    customer: typeof search.customer === "string" ? search.customer : undefined,
  }),
  loader: () => getAdminDashboard(),
  component: AdminCustomersPage,
})

function AdminCustomersPage() {
  const data = Route.useLoaderData()
  const search = Route.useSearch()
  const router = useRouter()

  return (
    <main className="min-h-svh px-4 py-5 text-foreground sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-7xl space-y-5">
        <AdminHeader />
        {!data.unlocked ? <AdminAccessNotice /> : null}
        {data.unlocked ? (
          <CustomersSection
            customers={data.customers}
            highlightedCustomerId={search.customer}
            refresh={() => router.invalidate()}
          />
        ) : null}
      </div>
    </main>
  )
}
