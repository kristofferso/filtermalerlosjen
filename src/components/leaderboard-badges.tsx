import type { Badge, BadgeId } from "@/lib/leaderboard"
import { getInitials } from "@/lib/initials"

const BADGE_EMOJI: Record<BadgeId, string> = {
  climber: "📈",
  diverse: "🌍",
  loyal: "❤️",
  spender: "💸",
  regular: "🎖️",
  "biggest-order": "📦",
  "early-bird": "🐦",
  newcomer: "✨",
}

function BadgeCard({ badge }: { badge: Badge }) {
  const emoji = BADGE_EMOJI[badge.id]

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-(--ledger-line) bg-card p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-mono text-xs tracking-[0.14em] text-muted-foreground uppercase">
            {badge.title}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {badge.description}
          </p>
        </div>
        <span className="text-2xl leading-none" aria-hidden="true">
          {emoji}
        </span>
      </div>

      {badge.available && badge.winners.length > 0 ? (
        <div className="mt-auto flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <span
              className="grid size-9 shrink-0 place-items-center rounded-md border border-border bg-muted/40 font-mono text-xs font-semibold"
              aria-hidden="true"
            >
              {getInitials(badge.winners[0].customerName)}
            </span>
            <p className="truncate text-sm font-semibold">
              {badge.winners.map((winner) => winner.customerName).join(", ")}
            </p>
          </div>
          {badge.stat ? (
            <span className="shrink-0 rounded-md border border-border px-2 py-1 font-mono text-xs font-semibold">
              {badge.stat}
            </span>
          ) : null}
        </div>
      ) : (
        <p className="mt-auto rounded-md border border-dashed border-border px-3 py-2 text-center font-mono text-xs text-muted-foreground">
          Kommer etter neste runde
        </p>
      )}
    </div>
  )
}

export function LeaderboardBadges({ badges }: { badges: Array<Badge> }) {
  return (
    <section className="rounded-lg border border-(--ledger-line) bg-card p-4 sm:p-6">
      <p className="font-mono text-xs tracking-[0.18em] text-muted-foreground uppercase">
        Utmerkelser
      </p>
      <h2 className="mt-2 font-serif text-3xl font-normal tracking-tight">
        Heder og ære
      </h2>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {badges.map((badge) => (
          <BadgeCard key={badge.id} badge={badge} />
        ))}
      </div>
    </section>
  )
}
