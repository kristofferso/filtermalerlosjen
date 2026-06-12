import { useMemo, useState } from "react"
import type { getCustomerHomeData } from "@/server/coffee"
import { getInitials } from "@/lib/initials"
import { formatKr } from "@/lib/money"
import { calculateOrderLeaderboard } from "@/lib/order-totals"

type OpenRound = NonNullable<
  Extract<
    Awaited<ReturnType<typeof getCustomerHomeData>>,
    { unlocked: true }
  >["openRound"]
>

export function OrderLeaderboard({ orders }: { orders: OpenRound["orders"] }) {
  const [expanded, setExpanded] = useState(false)
  const entries = useMemo(() => calculateOrderLeaderboard(orders), [orders])
  if (entries.length === 0) return null

  const totalBags = entries.reduce((sum, entry) => sum + entry.bagCount, 0)
  const totalKr = entries.reduce((sum, entry) => sum + entry.totalKr, 0)

  return (
    <section className="overflow-hidden rounded-lg border border-[var(--ledger-line)] bg-card shadow-sm">
      <button
        className="grid w-full gap-3 p-4 text-left hover:bg-muted/50"
        type="button"
        onClick={() => setExpanded((value) => !value)}
        aria-expanded={expanded}
      >
        <span>
          <span className="font-mono text-xs tracking-[0.18em] text-muted-foreground uppercase">
            TOPPLISTE
          </span>
          <span className="mt-1 block text-sm font-semibold">
            {entries.length} bestillinger, {totalBags} poser,{" "}
            {formatKr(totalKr)}
          </span>
        </span>
        <span className="justify-self-start rounded-md border border-border px-2 py-1 font-mono text-xs text-muted-foreground">
          {expanded ? "Skjul" : "Vis liste"}
        </span>
      </button>

      {expanded ? (
        <ol className="divide-y divide-border border-t border-border">
          {entries.map((entry, index) => (
            <li key={entry.orderId} className="p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span
                    className={`grid size-10 shrink-0 place-items-center rounded-md border font-mono text-xs font-semibold ${avatarClassName(index)}`}
                    aria-hidden="true"
                  >
                    {getInitials(entry.customerName)}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">
                      {entry.customerName}
                    </p>
                    <p className="font-mono text-xs text-muted-foreground">
                      #{index + 1}
                    </p>
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-mono text-sm font-semibold">
                    {entry.bagCount} poser
                  </p>
                  <p className="font-mono text-sm text-muted-foreground">
                    {formatKr(entry.totalKr)}
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ol>
      ) : null}
    </section>
  )
}

function avatarClassName(index: number) {
  if (index === 0) return "border-amber-300 bg-amber-100 text-amber-900"
  if (index === 1) return "border-slate-300 bg-slate-100 text-slate-800"
  if (index === 2) return "border-orange-300 bg-orange-100 text-orange-900"
  return "border-border bg-card text-muted-foreground"
}
