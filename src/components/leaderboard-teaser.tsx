import { Link } from "@tanstack/react-router"
import { formatGrams } from "@/lib/coffee-units"
import { getInitials } from "@/lib/initials"

export type LeaderboardTeaserData = {
  top3: Array<{ customerName: string; totalGrams: number; rank: number }>
  totalGramsAllTime: number
  completedRoundsCount: number
}

function medalAvatarClassName(rank: number) {
  if (rank === 1) return "border-amber-300 bg-amber-100 text-amber-900"
  if (rank === 2) return "border-slate-300 bg-slate-100 text-slate-800"
  return "border-orange-300 bg-orange-100 text-orange-900"
}

export function LeaderboardTeaser({
  teaser,
}: {
  teaser: LeaderboardTeaserData
}) {
  return (
    <Link
      to="/toppliste"
      className="block overflow-hidden rounded-lg border border-(--ledger-line) bg-card shadow-sm transition-colors hover:bg-muted/40"
    >
      <div className="flex items-center justify-between gap-3 border-b border-border p-4">
        <div>
          <p className="font-mono text-xs tracking-[0.18em] text-muted-foreground uppercase">
            Toppliste
          </p>
          <p className="mt-1 text-sm font-semibold">
            {formatGrams(teaser.totalGramsAllTime)} kaffe over{" "}
            {teaser.completedRoundsCount}{" "}
            {teaser.completedRoundsCount === 1 ? "runde" : "runder"}
          </p>
        </div>
        <span className="shrink-0 rounded-md border border-border px-2 py-1 font-mono text-xs text-muted-foreground">
          Se hele
        </span>
      </div>

      {teaser.top3.length > 0 ? (
        <ol className="divide-y divide-border">
          {teaser.top3.map((entry) => (
            <li
              key={entry.rank}
              className="flex items-center justify-between gap-3 p-3"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span
                  className={`grid size-9 shrink-0 place-items-center rounded-md border font-mono text-xs font-semibold ${medalAvatarClassName(entry.rank)}`}
                  aria-hidden="true"
                >
                  {getInitials(entry.customerName)}
                </span>
                <p className="truncate text-sm font-semibold">
                  {entry.rank}. {entry.customerName}
                </p>
              </div>
              <span className="shrink-0 font-mono text-sm font-semibold">
                {formatGrams(entry.totalGrams)}
              </span>
            </li>
          ))}
        </ol>
      ) : null}
    </Link>
  )
}
