import { useRouter } from "@tanstack/react-router"
import { useState } from "react"
import type { SupplierBoardEntry } from "@/lib/supplier-votes"
import { SupplierVoteCard } from "@/components/supplier-vote-card"
import { castSupplierVote, withdrawSupplierVote } from "@/server/coffee"

export function SupplierVoteBoard({
  board,
  myVoteSupplierId,
}: {
  board: Array<SupplierBoardEntry>
  myVoteSupplierId: string | null
}) {
  const router = useRouter()
  const [pendingSupplierId, setPendingSupplierId] = useState<string | null>(
    null
  )
  const [error, setError] = useState("")

  if (board.length === 0) {
    return (
      <section className="rounded-lg border border-(--ledger-line) bg-card p-6">
        <p className="font-mono text-xs tracking-[0.18em] text-muted-foreground uppercase">
          STATUS
        </p>
        <h2 className="mt-3 text-3xl tracking-tight">
          Ingen bestilling akkurat nå
        </h2>
        <p className="mt-2 max-w-prose text-sm text-muted-foreground">
          Ny runde vises her når den åpner.
        </p>
      </section>
    )
  }

  async function handleVote(supplierId: string) {
    setError("")
    setPendingSupplierId(supplierId)
    try {
      if (myVoteSupplierId === supplierId) {
        await withdrawSupplierVote()
      } else {
        await castSupplierVote({ data: { supplierId } })
      }
      await router.invalidate()
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Kunne ikke lagre stemmen"
      )
    } finally {
      setPendingSupplierId(null)
    }
  }

  return (
    <section className="rounded-lg border border-(--ledger-line) bg-card p-4 sm:p-5">
      <div className="border-b border-border pb-4">
        <p className="font-mono text-xs tracking-[0.18em] text-muted-foreground uppercase">
          KLAR FOR MER KAFFE?
        </p>
        <h2 className="mt-2 font-serif text-3xl font-normal tracking-tight">
          Stem på neste runde
        </h2>
        <p className="mt-2 max-w-prose text-sm text-muted-foreground">
          Si fra hvilken leverandør du ønsker neste runde fra. Du har én stemme
          — trykk igjen for å trekke den tilbake.
        </p>
      </div>

      {error ? <p className="mt-4 text-sm text-destructive">{error}</p> : null}

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {board.map((entry) => (
          <SupplierVoteCard
            key={entry.supplierId}
            entry={entry}
            isMyVote={myVoteSupplierId === entry.supplierId}
            disabled={pendingSupplierId !== null}
            loading={pendingSupplierId === entry.supplierId}
            onVote={() => handleVote(entry.supplierId)}
          />
        ))}
      </div>
    </section>
  )
}
