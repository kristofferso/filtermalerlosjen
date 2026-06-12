import { createFileRoute, redirect, useRouter } from "@tanstack/react-router"
import { AppHeader } from "@/components/app-header"
import { BRAND_NAME } from "@/components/brand"
import { CustomerStatusPanel } from "@/components/customer-status-panel"
import { LogisticsFooter } from "@/components/logistics-footer"
import { OrderForm } from "@/components/order-form"
import { SupplierVoteBoard } from "@/components/supplier-vote-board"
import { getCustomerLoginRedirect } from "@/lib/customer-route-guard"
import { getCustomerRouteAccess } from "@/server/customer-access"
import { logout } from "@/server/login.functions"
import { getCustomerHomeData } from "@/server/coffee"

export const Route = createFileRoute("/")({
  loader: async ({ location }) => {
    const access = await getCustomerRouteAccess()
    const loginRedirect = getCustomerLoginRedirect({
      authenticated: access.authenticated,
      currentPath: location.href,
    })
    if (loginRedirect) throw redirect(loginRedirect)

    return getCustomerHomeData()
  },
  component: CustomerPage,
})

function CustomerPage() {
  const data = Route.useLoaderData()
  const router = useRouter()

  if (!data.unlocked) return null

  return (
    <main className="min-h-svh px-4 py-5 text-foreground sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-5">
        <AppHeader
          title={BRAND_NAME}
          selectedCustomer={data.selectedCustomer}
          onLogout={async () => {
            await logout()
            await router.invalidate()
          }}
        />

        {data.selectedCustomer && !data.openRound ? (
          <>
            {data.statusOrder ? (
              <CustomerStatusPanel order={data.statusOrder} />
            ) : null}
            <SupplierVoteBoard
              board={data.supplierBoard}
              myVoteSupplierId={data.myVoteSupplierId}
            />
          </>
        ) : null}
        {data.selectedCustomer && data.openRound ? (
          <OrderForm
            openRound={data.openRound}
            selectedCustomer={data.selectedCustomer}
          />
        ) : null}
        <LogisticsFooter customers={data.customers} />
      </div>
    </main>
  )
}
