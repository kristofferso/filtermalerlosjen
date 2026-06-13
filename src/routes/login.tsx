import {
  createFileRoute,
  redirect,
  useNavigate,
  useRouter,
} from "@tanstack/react-router"
import { useState } from "react"

import { CustomerLoginCard } from "@/components/customer-login"
import { CustomerPasswordLanding } from "@/components/customer-lock"
import { getLoginStatus, unlockGateFn } from "@/server/login.functions"

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
  const data = Route.useLoaderData()
  const search = Route.useSearch()
  const router = useRouter()
  const navigate = useNavigate()

  if (!data.gateUnlocked) {
    return (
      <main className="min-h-svh text-foreground">
        <GateForm onUnlocked={() => router.invalidate()} />
      </main>
    )
  }

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

function GateForm({ onUnlocked }: { onUnlocked: () => Promise<void> }) {
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError("")
    setIsSubmitting(true)
    const result = await unlockGateFn({ data: { password } })
    setIsSubmitting(false)
    if (result.ok) {
      await onUnlocked()
    } else {
      setError(result.error)
    }
  }

  return (
    <CustomerPasswordLanding
      password={password}
      error={error}
      isSubmitting={isSubmitting}
      onPasswordChange={setPassword}
      onSubmit={handleSubmit}
    />
  )
}
