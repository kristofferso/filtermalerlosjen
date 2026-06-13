import {
  createFileRoute,
  redirect,
  useNavigate,
  useRouter,
} from "@tanstack/react-router"

import { CustomerLoginCard } from "@/components/customer-login"
import { getLoginStatus } from "@/server/login.functions"

export const Route = createFileRoute("/login")({
  validateSearch: (search): { redirect?: string } => ({
    redirect: typeof search.redirect === "string" ? search.redirect : undefined,
  }),
  loaderDeps: ({ search }) => ({ redirect: search.redirect }),
  loader: async ({ deps }) => {
    const status = await getLoginStatus()
    if (status.authenticated) throw redirect({ to: deps.redirect ?? "/" })
    return status
  },
  component: LoginPage,
})

function LoginPage() {
  const search = Route.useSearch()
  const router = useRouter()
  const navigate = useNavigate()

  return (
    <main className="flex min-h-svh items-center justify-center px-4 py-10 text-foreground">
      <CustomerLoginCard
        onComplete={async () => {
          await router.invalidate()
          await navigate({ to: search.redirect ?? "/" })
        }}
      />
    </main>
  )
}
