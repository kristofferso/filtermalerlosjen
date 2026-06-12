import type { SupplierBoardEntry } from "@/lib/supplier-votes"
import { AvatarStack } from "@/components/avatar-stack"

export function AdminVoteTally({
  tally,
}: {
  tally: Array<
    Pick<SupplierBoardEntry, "supplierId" | "name" | "voteCount" | "voters">
  >
}) {
  const totalVotes = tally.reduce((sum, entry) => sum + entry.voteCount, 0)

  return (
    <section className="overflow-hidden rounded-lg border border-(--ledger-line) bg-card">
      <div className="border-b border-border p-4">
        <p className="font-mono text-xs tracking-[0.18em] text-muted-foreground uppercase">
          KLAR FOR MER KAFFE
        </p>
        <h2 className="mt-2 font-serif text-2xl font-normal tracking-tight">
          {totalVotes === 0
            ? "Ingen stemmer ennå"
            : `${totalVotes} ${totalVotes === 1 ? "stemme" : "stemmer"}`}
        </h2>
      </div>

      {tally.length > 0 ? (
        <ul className="divide-y divide-border">
          {tally.map((entry) => (
            <li
              key={entry.supplierId}
              className="flex items-center justify-between gap-3 p-4"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{entry.name}</p>
                <p className="font-mono text-xs text-muted-foreground">
                  {entry.voters.map((voter) => voter.name).join(", ")}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <AvatarStack names={entry.voters.map((voter) => voter.name)} />
                <span className="font-mono text-sm font-semibold">
                  {entry.voteCount}
                </span>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  )
}
