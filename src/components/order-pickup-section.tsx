import { useState } from "react"
import { useRouter } from "@tanstack/react-router"
import { Check, ChevronDown } from "lucide-react"
import type { PickupSlot } from "@/lib/pickup-slots"
import { groupPickupSlotsByDate } from "@/lib/pickup-slots"
import { markdownToSafeHtml } from "@/lib/markdown"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { updateOrderPickupSlot } from "@/server/coffee"

type PickupOrder = {
  orderId: string
  collected: boolean
  pickupSlotId: string
  pickupInstructions: string
}

export function OrderPickupSection({
  order,
  slots,
}: {
  order: PickupOrder
  slots: Array<PickupSlot>
}) {
  const router = useRouter()
  const [savingSlotId, setSavingSlotId] = useState<string | null>(null)
  const [error, setError] = useState("")

  const trimmedInstructions = order.pickupInstructions.trim()
  const selectedSlot = slots.find((slot) => slot.id === order.pickupSlotId)
  const slotsByDate = groupPickupSlotsByDate(slots)

  async function selectSlot(slot: PickupSlot) {
    const selected = slot.id === order.pickupSlotId
    setError("")
    setSavingSlotId(slot.id)
    try {
      await updateOrderPickupSlot({
        data: { orderId: order.orderId, pickupSlotId: selected ? "" : slot.id },
      })
      await router.invalidate()
    } catch (event) {
      setError(
        event instanceof Error ? event.message : "Kunne ikke lagre hentetid."
      )
    } finally {
      setSavingSlotId(null)
    }
  }

  return (
    <section className="mt-8 border-t border-border pt-7">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-xl font-medium tracking-tight text-foreground">
            Henting
          </h2>
        </div>

        {order.collected ? (
          <div className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-white/30 bg-white/10 px-3 py-1 text-sm font-medium text-white dark:text-white">
            <Check
              className="size-4"
              aria-label="Bestillingen er hentet"
              role="img"
            />
            Hentet
          </div>
        ) : null}
      </div>

      {order.collected ? (
        <p className="mt-2 max-w-prose text-sm leading-6 text-muted-foreground">
          Du har hentet! På tide å komme i gang med bryggingen
        </p>
      ) : (
        <>
          <div className="mt-5">
            <p className="text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase">
              Instruksjoner
            </p>
            {trimmedInstructions ? (
              <div
                className="mt-2 space-y-2 text-sm leading-6 text-muted-foreground [&_a]:font-medium [&_a]:text-foreground [&_a]:underline [&_a]:underline-offset-4 [&_li]:ml-5 [&_li]:list-disc [&_p]:max-w-prose [&_strong]:text-foreground"
                dangerouslySetInnerHTML={{
                  __html: markdownToSafeHtml(trimmedInstructions),
                }}
              />
            ) : (
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Hent når som helst innenfor valgt vindu.
              </p>
            )}
          </div>

          <div className="mt-8">
            <div className="flex flex-wrap items-start justify-between gap-1">
              <div>
                <h3 className="text-base font-semibold tracking-tight text-foreground">
                  Velg tid
                </h3>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  Tidene hentes fra hentekalenderen.
                </p>
              </div>
            </div>
          </div>

          {slotsByDate.length === 0 ? (
            <p className="mt-4 rounded-lg border border-border bg-card p-3 text-sm text-muted-foreground">
              Ingen hentetider er lagt ut ennå.
            </p>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger
                className="mt-4 flex w-full items-center justify-between gap-3 rounded-lg border border-border bg-card px-3 py-2.5 text-left text-sm transition-colors hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60"
                disabled={Boolean(savingSlotId)}
              >
                <span className="min-w-0">
                  <span className="block text-xs font-medium text-muted-foreground">
                    Valgt hentetid
                  </span>
                  <span className="mt-0.5 block truncate font-mono text-sm text-foreground">
                    {selectedSlot?.label ?? "Velg hentetid"}
                  </span>
                </span>
                <ChevronDown
                  className="size-4 shrink-0 text-muted-foreground"
                  aria-hidden="true"
                />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="max-h-80">
                {slotsByDate.map((group, index) => (
                  <DropdownMenuGroup key={group.dateLabel}>
                    {index > 0 ? <DropdownMenuSeparator /> : null}
                    <DropdownMenuLabel className="font-mono tracking-[0.16em] uppercase">
                      {group.dateLabel}
                    </DropdownMenuLabel>
                    {group.slots.map((slot) => {
                      const selected = slot.id === order.pickupSlotId
                      const saving = savingSlotId === slot.id

                      return (
                        <DropdownMenuItem
                          key={slot.id}
                          disabled={Boolean(savingSlotId)}
                          onClick={() => selectSlot(slot)}
                          className="justify-between"
                        >
                          <span className="font-mono">{slot.timeLabel}</span>
                          <span className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground">
                            {saving ? (
                              selected ? (
                                "Fjerner valg"
                              ) : (
                                "Lagrer"
                              )
                            ) : selected ? (
                              <>
                                <Check className="size-3.5" aria-hidden="true" />
                                Valgt
                              </>
                            ) : null}
                          </span>
                        </DropdownMenuItem>
                      )
                    })}
                  </DropdownMenuGroup>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </>
      )}

      {error ? (
        <p className="mt-3 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </section>
  )
}
