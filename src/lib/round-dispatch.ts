// The automatic emails tied to a round, in the order they go out. Shared by
// the server (which rebuilds them) and the admin email page (which replays
// them).
export const ROUND_DISPATCH_KINDS = [
  "round-opened",
  "order-confirmed",
  "payment-ready",
  "pickup-ready",
] as const

export type RoundDispatchKind = (typeof ROUND_DISPATCH_KINDS)[number]

export type RoundDispatchStatus = "draft" | "open" | "closed" | "ready"

export const ROUND_DISPATCH_META: Record<
  RoundDispatchKind,
  { label: string; recipients: string }
> = {
  "round-opened": {
    label: "Ny runde åpnet",
    recipients: "Alle aktive medlemmer med e-post",
  },
  "order-confirmed": {
    label: "Bestilling mottatt",
    recipients: "Alle som har bestilt i runden",
  },
  "payment-ready": {
    label: "Oppgjør klart",
    recipients: "Alle som har bestilt i runden",
  },
  "pickup-ready": {
    label: "Klar for henting",
    recipients: "Alle som har bestilt i runden",
  },
}

// A dispatch can only be replayed once the round has reached the step that
// originally triggered it.
export function isRoundDispatchAvailable(
  kind: RoundDispatchKind,
  status: RoundDispatchStatus
) {
  switch (kind) {
    case "round-opened":
    case "order-confirmed":
      return status !== "draft"
    case "payment-ready":
      return status === "closed" || status === "ready"
    case "pickup-ready":
      return status === "ready"
  }
}
