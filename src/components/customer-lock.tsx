import { BRAND_NAME, FilterEngravedMark } from "@/components/brand"
import { Button } from "@/components/ui/button"

export function CustomerPasswordLanding({
  password,
  error,
  isSubmitting,
  onPasswordChange,
  onSubmit,
}: {
  password: string
  error: string
  isSubmitting: boolean
  onPasswordChange: (password: string) => void
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void
}) {
  return (
    <section className="mx-auto flex min-h-[calc(100svh-2.5rem)] w-full max-w-md flex-col items-center justify-center px-4 py-10 text-center sm:min-h-[calc(100svh-3rem)]">
      <div className="flex flex-col items-center">
        <FilterEngravedMark className="h-28 w-36" />
        <h1 className="mt-5 font-serif text-4xl font-normal tracking-tight text-balance sm:text-5xl">
          {BRAND_NAME}
        </h1>
        <p className="mt-3 font-mono text-[0.7rem] tracking-[0.22em] text-muted-foreground uppercase">
          Ad maiorem coffeae gloriam
        </p>
      </div>

      <div className="mt-8 max-w-[34rem] space-y-4 text-sm leading-6 text-muted-foreground sm:text-base">
        <p className="text-foreground">
          Kaffen går dit den blir kalt, gjennom vennskap, rykter og skjulte
          krefter i samfunnet.
        </p>

        <p>
          Losjen er lukket. Du må være anbefalt av noen som allerede kjenner
          tegnet før du kan tre inn.
        </p>
      </div>

      <form onSubmit={onSubmit} className="mt-8 w-full text-left">
        <label className="block space-y-2">
          <span className="text-sm font-medium">Kaffepassord</span>
          <input
            className="h-11 w-full rounded-md border border-input px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30"
            type="password"
            value={password}
            onChange={(event) => onPasswordChange(event.target.value)}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? "customer-password-error" : undefined}
            autoComplete="current-password"
          />
        </label>
        {error ? (
          <p
            id="customer-password-error"
            className="mt-3 text-sm text-destructive"
            role="alert"
          >
            {error}
          </p>
        ) : null}
        <Button
          className="mt-4 w-full"
          size="lg"
          type="submit"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Låser opp" : "Lås opp"}
        </Button>
      </form>
    </section>
  )
}
