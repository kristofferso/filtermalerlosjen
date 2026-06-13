import { Link } from "@tanstack/react-router"
import { formatGrams } from "@/lib/coffee-units"
import { getInitials } from "@/lib/initials"

export type LeaderboardTeaserEntry = {
  customerName: string
  totalGrams: number
  rank: number
}

export type LeaderboardTeaserData = {
  top3: Array<LeaderboardTeaserEntry>
  totalGramsAllTime: number
  completedRoundsCount: number
}

const MINI_STYLES: Record<
  number,
  { avatar: string; block: string; height: string; medal: string }
> = {
  1: {
    avatar: "border-amber-300 bg-amber-100 text-amber-900",
    block: "border-amber-300/40 bg-amber-200/15",
    height: "h-10",
    medal: "🥇",
  },
  2: {
    avatar: "border-slate-300 bg-slate-100 text-slate-800",
    block: "border-slate-300/30 bg-slate-200/10",
    height: "h-7",
    medal: "🥈",
  },
  3: {
    avatar: "border-orange-300 bg-orange-100 text-orange-900",
    block: "border-orange-300/30 bg-orange-200/10",
    height: "h-5",
    medal: "🥉",
  },
}

function MiniColumn({ entry }: { entry: LeaderboardTeaserEntry }) {
  const style = MINI_STYLES[entry.rank] ?? MINI_STYLES[3]

  return (
    <div className="flex flex-1 flex-col items-center justify-end gap-1.5">
      <span
        className={`grid size-10 place-items-center rounded-full border font-mono text-xs font-semibold ${style.avatar}`}
        aria-hidden="true"
      >
        {getInitials(entry.customerName)}
      </span>
      <p className="w-full truncate text-center text-xs font-semibold">
        {entry.customerName}
      </p>
      <p className="font-mono text-xs text-muted-foreground">
        {formatGrams(entry.totalGrams)}
      </p>
      <div
        className={`flex w-full items-center justify-center rounded-t-md border border-b-0 ${style.block} ${style.height}`}
      >
        <span className="text-sm" aria-hidden="true">
          {style.medal}
        </span>
      </div>
    </div>
  )
}

export function LeaderboardTeaser({
  teaser,
}: {
  teaser: LeaderboardTeaserData
}) {
  const [first, second, third] = teaser.top3

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
        <div className="mx-auto flex max-w-xs items-end justify-center gap-3 px-4 py-5">
          {teaser.top3.length > 1 ? (
            <MiniColumn entry={second} />
          ) : (
            <div className="flex-1" />
          )}
          {teaser.top3.length > 0 ? <MiniColumn entry={first} /> : null}
          {teaser.top3.length > 2 ? (
            <MiniColumn entry={third} />
          ) : (
            <div className="flex-1" />
          )}
        </div>
      ) : null}
    </Link>
  )
}
