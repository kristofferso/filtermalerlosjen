import { useEffect, useState } from "react"
import { Check, Circle } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  getPickupChecklistInitialState,
  getPickupChecklistSummary,
  getPickupScannerTone,
} from "@/lib/admin-order-row-ui"
import { formatKr } from "@/lib/money"
import { updateOrderFlags } from "@/server/coffee"

type PickupModeOrder = {
  orderId: string
  customerName: string
  paid: boolean
  collected: boolean
  totalKr: number
  pickupSlotLabel?: string
  items: Array<{
    name: string
    imageUrl?: string
    quantity: number
  }>
}

type OptionalAudioWindow = Omit<Window, "AudioContext"> & {
  AudioContext?: typeof AudioContext
  webkitAudioContext?: typeof AudioContext
}

export function AdminPickupMode({
  order,
  onCollected,
  actions,
}: {
  order: PickupModeOrder
  onCollected: () => Promise<void>
  actions?: React.ReactNode
}) {
  const [checkedByName, setCheckedByName] = useState(() =>
    getPickupChecklistInitialState(order.items, order.collected)
  )
  const visibleItems = order.items.filter((item) => item.quantity > 0)
  const pickupSummary = getPickupChecklistSummary(order.items, checkedByName)

  useEffect(() => {
    setCheckedByName(getPickupChecklistInitialState(order.items, order.collected))
  }, [order.orderId, order.items, order.collected])

  async function markAsCollected() {
    if (order.collected || !pickupSummary.allChecked) return
    await updateOrderFlags({
      data: {
        orderId: order.orderId,
        paid: order.paid,
        collected: true,
      },
    })
    await onCollected()
  }

  return (
    <section className="flex min-h-svh flex-col overflow-hidden bg-card">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-4 py-4 sm:px-6">
        <div>
          <p className="font-mono text-xs tracking-[0.18em] text-muted-foreground uppercase">
            Hentemodus
          </p>
          <h1 className="mt-1 text-3xl tracking-tight sm:text-4xl">
            {order.customerName} henter
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-3 font-mono text-sm text-muted-foreground">
            <span>
              {pickupSummary.checkedCount} av {pickupSummary.productCount}{" "}
              produkter sjekket
            </span>
            <span>{pickupSummary.bagCount} poser</span>
            <span>{formatKr(order.totalKr)}</span>
          </div>
        </div>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-4">
          {visibleItems.map((coffee) => {
            const checked = Boolean(checkedByName[coffee.name])
            return (
              <button
                key={coffee.name}
                className={`group grid min-h-72 gap-3 rounded-xl border text-left transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30 focus-visible:outline-none ${
                  checked
                    ? "border-(--ledger-ink) bg-muted/50"
                    : "border-border bg-card hover:bg-muted/30"
                }`}
                type="button"
                aria-pressed={checked}
                onClick={() =>
                  setCheckedByName((current) => {
                    const nextChecked = !current[coffee.name]
                    playPickupScannerTone(nextChecked)

                    return {
                      ...current,
                      [coffee.name]: nextChecked,
                    }
                  })
                }
              >
                <span className="relative overflow-hidden rounded-t-xl bg-muted p-1">
                  {coffee.imageUrl ? (
                    <img
                      className="aspect-square w-full object-contain"
                      src={coffee.imageUrl}
                      alt=""
                      loading="lazy"
                    />
                  ) : (
                    <span className="block aspect-square w-full" />
                  )}
                  <span className="absolute top-3 right-3 inline-flex size-9 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-sm">
                    {checked ? <Check className="size-5" /> : <Circle className="size-5" />}
                  </span>
                </span>
                <span className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3 p-3">
                  <span className="min-w-0 text-lg leading-tight font-semibold">
                    {coffee.name}
                  </span>
                  <span className="text-right">
                    <span className="block font-serif text-5xl leading-none">
                      {coffee.quantity}
                    </span>
                  </span>
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="border-t border-border bg-card px-4 pt-3 pb-5 sm:px-6 sm:pb-6">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-mono text-sm text-muted-foreground">
            {pickupSummary.bagCount} poser totalt
          </p>
          <Button
            className="h-12 w-full text-base sm:w-auto sm:min-w-64"
            type="button"
            disabled={order.collected || !pickupSummary.allChecked}
            onClick={markAsCollected}
          >
            {order.collected ? "Allerede hentet" : "Merk som hentet"}
          </Button>
        </div>
      </div>
    </section>
  )
}

function playPickupScannerTone(checked: boolean) {
  const tone = getPickupScannerTone(checked)
  const audioWindow = window as OptionalAudioWindow
  const AudioContextConstructor =
    audioWindow.AudioContext || audioWindow.webkitAudioContext

  if (!AudioContextConstructor) return

  try {
    const context = new AudioContextConstructor()
    const oscillator = context.createOscillator()
    const gain = context.createGain()
    const now = context.currentTime
    const durationSeconds = tone.durationMs / 1000

    oscillator.type = "square"
    oscillator.frequency.setValueAtTime(tone.frequencyHz, now)
    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.exponentialRampToValueAtTime(0.05, now + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + durationSeconds)

    oscillator.connect(gain)
    gain.connect(context.destination)
    oscillator.start(now)
    oscillator.stop(now + durationSeconds)
    oscillator.onended = () => void context.close()
  } catch {
    // Audio feedback is optional. Keep pickup mode usable if the browser blocks it.
  }
}
