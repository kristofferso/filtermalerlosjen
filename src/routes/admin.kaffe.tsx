import { createFileRoute, useRouter } from "@tanstack/react-router"
import { AdminAccessNotice, AdminHeader, CatalogSection } from "./admin"
import { getAdminDashboard } from "@/server/coffee"

export const Route = createFileRoute("/admin/kaffe")({
  loader: () => getAdminDashboard(),
  component: AdminCoffeePage,
})

function AdminCoffeePage() {
  const data = Route.useLoaderData()
  const router = useRouter()

  return (
    <main className="min-h-svh px-4 py-5 text-foreground sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-7xl space-y-5">
        <AdminHeader />
        {!data.unlocked ? <AdminAccessNotice /> : null}
        {data.unlocked ? (
          <CatalogSection
            dashboard={data}
            refresh={() => router.invalidate()}
          />
        ) : null}
      </div>
    </main>
  )
}
