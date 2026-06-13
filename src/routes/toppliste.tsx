import { createFileRoute, redirect, useRouter } from "@tanstack/react-router"
import { AppHeader } from "@/components/app-header"
import { BRAND_NAME } from "@/components/brand"
import { LeaderboardBadges } from "@/components/leaderboard-badges"
import { LeaderboardCharts } from "@/components/leaderboard-charts"
import { LeaderboardPodium } from "@/components/leaderboard-podium"
import { LeaderboardRanking } from "@/components/leaderboard-ranking"
import { LogisticsFooter } from "@/components/logistics-footer"
import { getCustomerLoginRedirect } from "@/lib/customer-route-guard"
import { getCustomerRouteAccess } from "@/server/customer-access"
import { getLeaderboardData } from "@/server/coffee"
import { logout } from "@/server/login.functions"

export const Route = createFileRoute("/toppliste")({
  loader: async ({ location }) => {
    const access = await getCustomerRouteAccess()
    const loginRedirect = getCustomerLoginRedirect({
      authenticated: access.authenticated,
      currentPath: location.href,
    })
    if (loginRedirect) throw redirect(loginRedirect)

    return getLeaderboardData()
  },
  component: TopplistePage,
})

function TopplistePage() {
  const data = Route.useLoaderData()
  const router = useRouter()

  if (!data.unlocked) return null

  const { leaderboard } = data

  return (
    <main className="min-h-svh px-4 py-5 text-foreground sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-5">
        <AppHeader
          title={BRAND_NAME}
          activeNav="toppliste"
          selectedCustomer={data.selectedCustomer}
          onLogout={async () => {
            await logout()
            await router.invalidate()
          }}
        />

        <LeaderboardPodium podium={leaderboard.podium} />
        <LeaderboardRanking ranking={leaderboard.ranking} />
        <LeaderboardBadges badges={leaderboard.badges} />
        <LeaderboardCharts charts={leaderboard.charts} />

        <LogisticsFooter customers={data.customers} />
      </div>
    </main>
  )
}
