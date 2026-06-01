import { BRAND_NAME, BrandLogo } from "@/components/brand"
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
    <section
      className="relative flex min-h-svh w-full flex-col items-center justify-center overflow-hidden bg-cover bg-center px-4 py-10 text-center"
      style={{
        backgroundImage:
          "linear-gradient(to bottom, transparent 55%, rgb(0 0 0 / 0.3) 100%), url('/bg.png')",
      }}
    >
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-border bg-card/95 p-6 text-card-foreground shadow-2xl shadow-black/20 sm:p-8">
        <div className="flex flex-col items-center">
          <h1 className="font-serif text-5xl font-normal tracking-tight text-balance sm:text-6xl">
            {BRAND_NAME}
          </h1>
          <p className="mt-3 font-mono text-[0.7rem] tracking-[0.22em] text-muted-foreground uppercase">
            siden 2018
          </p>
        </div>

        <div className="mx-auto mt-8 max-w-[40ch] space-y-4 text-sm leading-6 text-muted-foreground">
          <p className="text-foreground">
            Råvareprisene øker, inflasjonen lekker inn fra verdensøkonomien og
            dagligvaremafiaen får holde på. Noe må gjøres...
          </p>

          <p>...for at vi skal kunne fortsette å drikke digg kaffe.</p>
        </div>

        <form onSubmit={onSubmit} className="mt-8 w-full text-left">
          <label className="block space-y-2">
            <span className="text-sm font-medium">Hemmelig ord</span>
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
            {isSubmitting ? "Trer inn..." : "Tre inn"}
          </Button>
        </form>
      </div>

      <BrandLogo
        decorative
        className="pointer-events-none absolute bottom-5 left-1/2 h-9 w-auto -translate-x-1/2 opacity-55 brightness-0 invert sm:bottom-6 sm:h-10"
      />
    </section>
  )
}
