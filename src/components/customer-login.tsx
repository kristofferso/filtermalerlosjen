import { useRef, useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { registerCustomer, selectCustomer } from "@/server/coffee"

export type CustomerLoginOption = {
  id: string
  name: string
}

export function CustomerLoginCard({
  customers,
  onComplete,
}: {
  customers: Array<CustomerLoginOption>
  onComplete: () => Promise<void>
}) {
  const [selectedCustomerId, setSelectedCustomerId] = useState("")
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")
  const [error, setError] = useState("")
  const [isSelecting, setIsSelecting] = useState(false)
  const [isRegistering, setIsRegistering] = useState(false)
  const pendingActionRef = useRef<"select" | "register" | null>(null)

  async function handleSelect(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selectedCustomerId || pendingActionRef.current) return
    pendingActionRef.current = "select"
    setError("")
    setIsSelecting(true)
    try {
      await selectCustomer({ data: { customerId: selectedCustomerId } })
      await onComplete()
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Kunne ikke velge person"
      )
    } finally {
      pendingActionRef.current = null
      setIsSelecting(false)
    }
  }

  async function handleRegister(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pendingActionRef.current) return
    pendingActionRef.current = "register"
    setError("")
    setIsRegistering(true)
    try {
      await registerCustomer({ data: { name, phone, email } })
      await onComplete()
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Kunne ikke registrere person"
      )
      pendingActionRef.current = null
      setIsRegistering(false)
    }
  }

  return (
    <section className="w-full max-w-md rounded-xl border border-(--ledger-line) bg-card p-5 shadow-2xl shadow-black/25 sm:p-6">
      <form onSubmit={handleSelect}>
        <h1 className="font-serif text-4xl font-normal tracking-tight">
          Identifiser deg
        </h1>

        <label className="mt-6 block space-y-2">
          <span className="text-sm font-medium">Ditt medlemsnavn</span>
          <select
            className="h-10 w-full rounded-md border border-input bg-background py-0 pr-10 pl-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30"
            value={selectedCustomerId}
            onChange={(event) => setSelectedCustomerId(event.target.value)}
            disabled={isSelecting || isRegistering}
          >
            <option value="" disabled>
              (⌐ ͡■ ͜ʖ ͡■)
            </option>
            {customers.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.name}
              </option>
            ))}
          </select>
        </label>
        <Button
          className="mt-5 w-full"
          size="lg"
          type="submit"
          disabled={!selectedCustomerId || isSelecting || isRegistering}
        >
          {isSelecting ? "Trer inn..." : "Tre inn"}
        </Button>
      </form>

      <div className="my-6 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <span className="h-px bg-border" />
        <span className="font-mono text-xs tracking-[0.18em] text-muted-foreground uppercase">
          eller
        </span>
        <span className="h-px bg-border" />
      </div>

      <div className="text-center text-sm text-muted-foreground">
        Ikke medlem enda?{" "}
        <Dialog>
          <DialogTrigger className="font-medium text-foreground underline-offset-4 hover:underline focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30 focus-visible:outline-none">
            Bli med i losjen
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Bli med i losjen</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleRegister}>
              <div className="grid gap-3 text-left">
                <TextField
                  label="Navn"
                  value={name}
                  onChange={setName}
                  autoComplete="name"
                  disabled={isSelecting || isRegistering}
                />
                <TextField
                  label="Telefonnummer"
                  value={phone}
                  onChange={setPhone}
                  autoComplete="tel-national"
                  inputMode="numeric"
                  pattern="[0-9]{8}"
                  maxLength={8}
                  disabled={isSelecting || isRegistering}
                />
                <TextField
                  label="E-post"
                  value={email}
                  onChange={setEmail}
                  autoComplete="email"
                  type="email"
                  disabled={isSelecting || isRegistering}
                />
              </div>
              <Button
                className="mt-5 w-full"
                type="submit"
                disabled={isSelecting || isRegistering}
              >
                {isRegistering ? "Blir med..." : "Bli med"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {error ? (
        <p className="mt-4 text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  )
}

function TextField({
  label,
  value,
  onChange,
  type = "text",
  ...inputProps
}: {
  label: string
  value: string
  onChange: (value: string) => void
  type?: string
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value">) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium">{label}</span>
      <input
        className="h-10 w-full rounded-md border border-input bg-background px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30"
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required
        {...inputProps}
      />
    </label>
  )
}
