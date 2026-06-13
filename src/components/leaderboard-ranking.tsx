import type { RankingEntry } from "@/lib/leaderboard"
import { formatGrams } from "@/lib/coffee-units"
import { getInitials } from "@/lib/initials"
import { formatKr } from "@/lib/money"

function avatarClassName(rank: number) {
  if (rank === 1) return "border-amber-300 bg-amber-100 text-amber-900"
  if (rank === 2) return "border-slate-300 bg-slate-100 text-slate-800"
  if (rank === 3) return "border-orange-300 bg-orange-100 text-orange-900"
  return "border-border bg-card text-muted-foreground"
}

export function LeaderboardRanking({
  ranking,
}: {
  ranking: Array<RankingEntry>
}) {
  if (ranking.length === 0) return null

  return (
    <section className="overflow-hidden rounded-lg border border-(--ledger-line) bg-card shadow-sm">
      <div className="border-b border-border p-4">
        <p className="font-mono text-xs tracking-[0.18em] text-muted-foreground uppercase">
          Toppliste
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Sortert på totalt antall gram fra fullførte runder.
        </p>
      </div>
      <ol className="divide-y divide-border">
        {ranking.map((entry) => (
          <li key={entry.memberKey} className="p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <span className="w-6 shrink-0 text-right font-mono text-sm text-muted-foreground tabular-nums">
                  {entry.rank}
                </span>
                <span
                  className={`grid size-10 shrink-0 place-items-center rounded-md border font-mono text-xs font-semibold ${avatarClassName(entry.rank)}`}
                  aria-hidden="true"
                >
                  {getInitials(entry.customerName)}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">
                    {entry.customerName}
                  </p>
                  <p className="font-mono text-xs text-muted-foreground">
                    {entry.roundsParticipated}{" "}
                    {entry.roundsParticipated === 1 ? "runde" : "runder"} ·{" "}
                    {entry.distinctCoffeeTypes}{" "}
                    {entry.distinctCoffeeTypes === 1 ? "sort" : "sorter"}
                  </p>
                </div>
              </div>
              <div className="shrink-0 text-right">
                <p className="font-mono text-sm font-semibold">
                  {formatGrams(entry.totalGrams)}
                </p>
                <p className="font-mono text-sm text-muted-foreground">
                  {formatKr(entry.totalKr)}
                </p>
              </div>
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}
