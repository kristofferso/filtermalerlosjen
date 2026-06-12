import type { SupplierBoardEntry } from "@/lib/supplier-votes"
import { AvatarStack } from "@/components/avatar-stack"
import { ProductImageStack } from "@/components/product-image-stack"
import { Button } from "@/components/ui/button"
import { formatKr } from "@/lib/money"
import { cn } from "@/lib/utils"
import { addCoffeeVat } from "@/lib/vat"

export function SupplierVoteCard({
  entry,
  isMyVote,
  disabled,
  onVote,
}: {
  entry: SupplierBoardEntry
  isMyVote: boolean
  disabled: boolean
  onVote: () => void
}) {
  const minKr = addCoffeeVat(entry.priceRange.minKr)
  const maxKr = addCoffeeVat(entry.priceRange.maxKr)
  const priceLabel =
    minKr === maxKr ? formatKr(minKr) : `${formatKr(minKr)}–${formatKr(maxKr)}`

  return (
    <div
      className={cn(
        "flex flex-col gap-4 rounded-lg border p-4 transition-colors",
        isMyVote ? "border-(--ledger-ink) bg-muted/50" : "border-border bg-card"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-serif text-2xl font-normal tracking-tight">
            {entry.name}
          </h3>
          <p className="mt-1 font-mono text-sm text-muted-foreground">
            {priceLabel}
          </p>
        </div>
        <ProductImageStack images={entry.imageUrls} className="shrink-0" />
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
        {entry.voteCount > 0 ? (
          <div className="flex min-w-0 items-center gap-2">
            <AvatarStack names={entry.voters.map((voter) => voter.name)} />
            <span className="font-mono text-xs text-muted-foreground">
              {entry.voteCount} {entry.voteCount === 1 ? "stemme" : "stemmer"}
            </span>
          </div>
        ) : (
          <span className="font-mono text-xs text-muted-foreground">
            Ingen stemmer ennå
          </span>
        )}

        <Button
          type="button"
          size="sm"
          variant={isMyVote ? "secondary" : "default"}
          disabled={disabled}
          onClick={onVote}
        >
          {isMyVote ? "Din stemme ✓" : "Stem"}
        </Button>
      </div>
    </div>
  )
}
