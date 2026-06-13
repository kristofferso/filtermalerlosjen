import type { RankingEntry } from "@/lib/leaderboard"
import { formatGrams } from "@/lib/coffee-units"
import { getInitials } from "@/lib/initials"
import { formatKr } from "@/lib/money"

const PODIUM_STYLES: Record<
  number,
  { avatar: string; block: string; height: string; medal: string }
> = {
  1: {
    avatar: "border-amber-300 bg-amber-100 text-amber-900",
    block: "bg-amber-200/15 border-amber-300/40",
    height: "h-24 sm:h-28",
    medal: "🥇",
  },
  2: {
    avatar: "border-slate-300 bg-slate-100 text-slate-800",
    block: "bg-slate-200/10 border-slate-300/30",
    height: "h-16 sm:h-20",
    medal: "🥈",
  },
  3: {
    avatar: "border-orange-300 bg-orange-100 text-orange-900",
    block: "bg-orange-200/10 border-orange-300/30",
    height: "h-12 sm:h-16",
    medal: "🥉",
  },
}

function PodiumColumn({ entry }: { entry: RankingEntry }) {
  const style = PODIUM_STYLES[entry.rank] ?? PODIUM_STYLES[3]

  return (
    <div className="flex flex-1 flex-col items-center justify-end gap-3">
      <div className="flex flex-col items-center gap-2 text-center">
        <span
          className={`grid size-14 place-items-center rounded-full border font-mono text-base font-semibold ${style.avatar}`}
          aria-hidden="true"
        >
          {getInitials(entry.customerName)}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{entry.customerName}</p>
          <p className="font-mono text-sm font-semibold">
            {formatGrams(entry.totalGrams)}
          </p>
          <p className="font-mono text-xs text-muted-foreground">
            {formatKr(entry.totalKr)}
          </p>
        </div>
      </div>
      <div
        className={`flex w-full items-start justify-center rounded-t-md border border-b-0 pt-2 ${style.block} ${style.height}`}
      >
        <span className="text-2xl" aria-hidden="true">
          {style.medal}
        </span>
      </div>
    </div>
  )
}

function RankRow({ entry }: { entry: RankingEntry }) {
  return (
    <li className="flex items-center justify-between gap-3 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <span className="w-6 shrink-0 text-right font-mono text-sm text-muted-foreground tabular-nums">
          {entry.rank}
        </span>
        <span
          className="grid size-10 shrink-0 place-items-center rounded-md border border-border bg-card font-mono text-xs font-semibold text-muted-foreground"
          aria-hidden="true"
        >
          {getInitials(entry.customerName)}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{entry.customerName}</p>
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
    </li>
  )
}

export function LeaderboardPodium({
  podium,
  rest,
}: {
  podium: Array<RankingEntry>
  rest: Array<RankingEntry>
}) {
  return (
    <section className="rounded-lg border border-(--ledger-line) bg-card p-4 sm:p-6">
      <p className="font-mono text-xs tracking-[0.18em] text-muted-foreground uppercase">
        Pallen
      </p>
      <h2 className="mt-2 font-serif text-3xl font-normal tracking-tight">
        Mest kaffe i gram
      </h2>

      {podium.length === 0 ? (
        <p className="mt-4 max-w-prose text-sm text-muted-foreground">
          Pallen fylles ut når den første runden er ferdig. Vær med på neste
          bestilling for å klatre.
        </p>
      ) : (
        <div className="mx-auto mt-6 flex max-w-md items-end justify-center gap-2 sm:gap-4">
          {/* Visual podium order: silver, gold, bronze. */}
          {podium[1] ? (
            <PodiumColumn entry={podium[1]} />
          ) : (
            <div className="flex-1" />
          )}
          {podium[0] ? <PodiumColumn entry={podium[0]} /> : null}
          {podium[2] ? (
            <PodiumColumn entry={podium[2]} />
          ) : (
            <div className="flex-1" />
          )}
        </div>
      )}

      {rest.length > 0 ? (
        <ol className="mt-4 divide-y divide-border border-t border-border">
          {rest.map((entry) => (
            <RankRow key={entry.memberKey} entry={entry} />
          ))}
        </ol>
      ) : null}
    </section>
  )
}
