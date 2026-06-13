import {
  Heart,
  Layers,
  Medal,
  Package,
  Sparkles,
  Sunrise,
  TrendingUp,
  Wallet,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import type { Badge, BadgeId } from "@/lib/leaderboard"
import { AvatarStack } from "@/components/avatar-stack"

const BADGE_VISUAL: Record<
  BadgeId,
  { icon: LucideIcon; ring: string; tint: string }
> = {
  climber: {
    icon: TrendingUp,
    ring: "ring-emerald-400/40",
    tint: "text-emerald-300",
  },
  diverse: { icon: Layers, ring: "ring-sky-400/40", tint: "text-sky-300" },
  loyal: { icon: Heart, ring: "ring-rose-400/40", tint: "text-rose-300" },
  spender: { icon: Wallet, ring: "ring-amber-400/40", tint: "text-amber-300" },
  regular: { icon: Medal, ring: "ring-violet-400/40", tint: "text-violet-300" },
  "biggest-order": {
    icon: Package,
    ring: "ring-orange-400/40",
    tint: "text-orange-300",
  },
  "early-bird": {
    icon: Sunrise,
    ring: "ring-yellow-400/40",
    tint: "text-yellow-300",
  },
  newcomer: {
    icon: Sparkles,
    ring: "ring-fuchsia-400/40",
    tint: "text-fuchsia-300",
  },
}

function BadgeCard({ badge }: { badge: Badge }) {
  const visual = BADGE_VISUAL[badge.id]
  const Icon = visual.icon
  const names = badge.winners.map((winner) => winner.customerName)

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-(--ledger-line) bg-card p-4">
      <div className="flex items-start gap-3">
        <span
          className={`grid size-9 shrink-0 place-items-center rounded-full bg-gradient-to-b from-muted to-card ring-1 ${visual.ring}`}
          aria-hidden="true"
        >
          <Icon className={`size-4 ${visual.tint}`} />
        </span>
        <div className="min-w-0">
          <p className="font-mono text-xs tracking-[0.14em] text-muted-foreground uppercase">
            {badge.title}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {badge.description}
          </p>
        </div>
      </div>

      {badge.available && names.length > 0 ? (
        <div className="mt-auto flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
          <div className="flex min-w-0 items-center gap-2">
            <AvatarStack names={names} max={4} />
            <p className="min-w-0 truncate text-sm font-semibold">
              {names.length === 1 ? names[0] : `${names.length} personer`}
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
