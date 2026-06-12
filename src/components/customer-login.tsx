import { useState } from "react"

import { Button } from "@/components/ui/button"
import {
  requestLoginCode,
  signup,
  verifyLoginCode,
} from "@/server/login.functions"

type Step = "email" | "code" | "signup"

export function CustomerLoginCard({
  onComplete,
}: {
  onComplete: () => Promise<void>
}) {
  const [step, setStep] = useState<Step>("email")
  const [email, setEmail] = useState("")
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [code, setCode] = useState("")
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  function resetTo(next: Step) {
    setError("")
    setNotice("")
    setStep(next)
  }

  async function handleRequestCode(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError("")
    setNotice("")
    setIsSubmitting(true)
    try {
      const result = await requestLoginCode({ data: { email } })
      if (result.ok) {
        setNotice(`Vi sendte en kode til ${email}.`)
        setStep("code")
      } else if ("notFound" in result && result.notFound) {
        setNotice("Vi fant ingen konto. Bli med i losjen under.")
        setStep("signup")
      } else {
        setError(result.error)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleSignup(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError("")
    setNotice("")
    setIsSubmitting(true)
    try {
      const result = await signup({
        data: { name, email, phone: phone || undefined },
      })
      if (result.ok) {
        setNotice(`Velkommen! Vi sendte en kode til ${email}.`)
        setStep("code")
      } else {
        setError(result.error)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleVerify(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError("")
    setIsSubmitting(true)
    try {
      const result = await verifyLoginCode({ data: { email, code } })
      if (result.ok) {
        await onComplete()
      } else {
        setError(result.error)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className="w-full max-w-md rounded-xl border border-(--ledger-line) bg-card p-5 shadow-2xl shadow-black/25 sm:p-6">
      {step === "email" ? (
        <form onSubmit={handleRequestCode}>
          <h1 className="font-serif text-4xl font-normal tracking-tight">
            Logg inn
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Skriv inn e-posten din, så sender vi deg en engangskode.
          </p>
          <TextField
            className="mt-6"
            label="E-post"
            value={email}
            onChange={setEmail}
            autoComplete="email"
            type="email"
            disabled={isSubmitting}
          />
          <Button
            className="mt-5 w-full"
            size="lg"
            type="submit"
            disabled={isSubmitting || !email}
          >
            {isSubmitting ? "Sender kode..." : "Send kode"}
          </Button>
        </form>
      ) : null}

      {step === "signup" ? (
        <form onSubmit={handleSignup}>
          <h1 className="font-serif text-4xl font-normal tracking-tight">
            Bli med i losjen
          </h1>
          <div className="mt-6 grid gap-3 text-left">
            <TextField
              label="Navn"
              value={name}
              onChange={setName}
              autoComplete="name"
              disabled={isSubmitting}
            />
            <TextField
              label="E-post"
              value={email}
              onChange={setEmail}
              autoComplete="email"
              type="email"
              disabled={isSubmitting}
            />
            <TextField
              label="Telefonnummer (valgfritt)"
              value={phone}
              onChange={setPhone}
              autoComplete="tel-national"
              inputMode="numeric"
              pattern="[0-9]{8}"
              maxLength={8}
              required={false}
              disabled={isSubmitting}
            />
          </div>
          <Button
            className="mt-5 w-full"
            size="lg"
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Blir med..." : "Bli med"}
          </Button>
          <button
            type="button"
            className="mt-4 w-full text-center text-sm text-muted-foreground underline-offset-4 hover:underline"
            onClick={() => resetTo("email")}
            disabled={isSubmitting}
          >
            Har du allerede konto? Logg inn
          </button>
        </form>
      ) : null}

      {step === "code" ? (
        <form onSubmit={handleVerify}>
          <h1 className="font-serif text-4xl font-normal tracking-tight">
            Skriv inn kode
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Vi sendte en 6-sifret kode til {email}.
          </p>
          <TextField
            className="mt-6"
            label="Engangskode"
            value={code}
            onChange={(value) =>
              setCode(value.replace(/\D/g, "").slice(0, 6))
            }
            inputMode="numeric"
            pattern="[0-9]{6}"
            maxLength={6}
            autoComplete="one-time-code"
            disabled={isSubmitting}
          />
          <Button
            className="mt-5 w-full"
            size="lg"
            type="submit"
            disabled={isSubmitting || code.length !== 6}
          >
            {isSubmitting ? "Logger inn..." : "Logg inn"}
          </Button>
          <button
            type="button"
            className="mt-4 w-full text-center text-sm text-muted-foreground underline-offset-4 hover:underline"
            onClick={() => resetTo("email")}
            disabled={isSubmitting}
          >
            Bruk en annen e-post
          </button>
        </form>
      ) : null}

      {notice ? (
        <p className="mt-4 text-sm text-muted-foreground" role="status">
          {notice}
        </p>
      ) : null}
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
  className = "",
  required = true,
  ...inputProps
}: {
  label: string
  value: string
  onChange: (value: string) => void
  type?: string
  className?: string
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value">) {
  return (
    <label className={`block space-y-2 ${className}`}>
      <span className="text-sm font-medium">{label}</span>
      <input
        className="h-10 w-full rounded-md border border-input bg-background px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30"
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        {...inputProps}
      />
    </label>
  )
}
