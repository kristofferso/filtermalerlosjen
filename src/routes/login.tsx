import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router"
import { useState } from "react"

import { CustomerLoginCard } from "@/components/customer-login"
import { CustomerPasswordLanding } from "@/components/customer-lock"
import { unlockCustomer } from "@/server/auth.functions"
import { getCustomerLoginData } from "@/server/coffee"

export const Route = createFileRoute("/login")({
  validateSearch: (search): { redirect?: string } => ({
    redirect: typeof search.redirect === "string" ? search.redirect : undefined,
  }),
  loader: () => getCustomerLoginData(),
  component: LoginPage,
})

function LoginPage() {
  const data = Route.useLoaderData()
  const search = Route.useSearch()
  const router = useRouter()
  const navigate = useNavigate()

  if (!data.unlocked) {
    return (
      <main className="min-h-svh text-foreground">
        <PasswordForm onUnlocked={() => router.invalidate()} />
      </main>
    )
  }

  return (
    <main className="flex min-h-svh items-center justify-center px-4 py-10 text-foreground">
      <CustomerLoginCard
        customers={data.customers}
        onComplete={async () => {
          await router.invalidate()
          await navigate({ to: search.redirect ?? "/" })
        }}
      />
    </main>
  )
}

function PasswordForm({ onUnlocked }: { onUnlocked: () => Promise<void> }) {
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError("")
    setIsSubmitting(true)
    const result = await unlockCustomer({ data: { password } })
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
