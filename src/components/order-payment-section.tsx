import { Check } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"

type PaymentOrder = {
  paid: boolean
  vippsUrl: string | null
}

export function OrderPaymentSection({ order }: { order: PaymentOrder }) {
  return (
    <section className="mt-6 border-t border-border pt-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-xl font-medium tracking-tight text-foreground">
            Betaling
          </h2>
          <p className="mt-2 max-w-prose text-sm leading-6 text-muted-foreground">
            {order.paid
              ? "Du har betalt! Her er alt i skjønneste orden"
              : "Betalinger må oppdateres manuelt, så det vises ikke her umiddelbart."}
          </p>
        </div>

        {order.paid ? (
          <div className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-white/30 bg-white/10 px-3 py-1 text-sm font-medium text-white dark:text-white">
            <Check
              className="size-4"
              aria-label="Betaling registrert"
              role="img"
            />
            Betalt
          </div>
        ) : null}
      </div>

      <div className="mt-5">
        {order.paid ? null : order.vippsUrl ? (
          <a
            className={buttonVariants({ className: "w-full", size: "lg" })}
            href={order.vippsUrl}
          >
            Betal med Vipps
          </a>
        ) : (
          <p className="rounded-lg border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
            Betaling er ikke konfigurert ennå.
          </p>
        )}
      </div>
    </section>
  )
}
