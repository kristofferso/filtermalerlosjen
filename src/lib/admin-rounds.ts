type AdminRoundOrder = {
  paid: boolean
  collected: boolean
  items: Array<{ quantity: number }>
}

type AdminActionRound = {
  status: string
  closesAt: Date | string | null
  shippingKr: number
  pickupInstructions: string
  orders: Array<Pick<AdminRoundOrder, "paid" | "collected" | "items">>
}

type AdminActionQueueInput = {
  openRound: AdminActionRound | null
  closedRounds: Array<AdminActionRound>
}

export type AdminActionQueueItem = {
  label: string
  value: string
  tone: "active" | "attention" | "neutral"
}

type SortableAdminOrder = {
  orderId: string
  customerName: string
  paid: boolean
  collected: boolean
}

type AdminRound = {
  id: string
  status: string
  openedAt: Date | string | null
  closedAt: Date | string | null
  closesAt: Date | string | null
  supplier: { name: string } | null
  orders: Array<AdminRoundOrder>
}

export function summarizeAdminRound(round: AdminRound) {
  return {
    id: round.id,
    supplierName: round.supplier?.name ?? "Ukjent",
    statusLabel: getRoundStatusLabel(round.status),
    date: getRoundCardDate(round),
    orderCount: round.orders.length,
    bagCount: round.orders.reduce(
      (sum, order) =>
        sum + order.items.reduce((itemSum, item) => itemSum + item.quantity, 0),
      0
    ),
    paidCount: round.orders.filter((order) => order.paid).length,
    collectedCount: round.orders.filter((order) => order.collected).length,
  }
}

export function getDefaultOrderExpanded() {
  return false
}

export function getDefaultBulkOrderExpanded() {
  return false
}

export function sortAdminOrderTotals<TOrder extends SortableAdminOrder>(
  orders: Array<TOrder>
): Array<TOrder> {
  return [...orders].sort(
    (left, right) =>
      Number(left.collected) - Number(right.collected) ||
      Number(right.paid) - Number(left.paid) ||
      left.customerName.localeCompare(right.customerName, "nb-NO")
  )
}

export function getAdminActionQueue({
  openRound,
  closedRounds,
}: AdminActionQueueInput): Array<AdminActionQueueItem> {
  const queue: Array<AdminActionQueueItem> = []
  const operationalRound = openRound ?? closedRounds[0] ?? null

  if (openRound?.closesAt) {
    queue.push({
      label: "Runde stenger",
      value: formatQueueDate(openRound.closesAt),
      tone: "active",
    })
  }

  if (operationalRound && !operationalRound.pickupInstructions.trim()) {
    queue.push({
      label: "Henteinfo mangler",
      value: "Legg inn tekst før oppgjør",
      tone: "attention",
    })
  }

  if (
    operationalRound &&
    operationalRound.status !== "open" &&
    operationalRound.shippingKr === 0
  ) {
    queue.push({
      label: "Frakt mangler",
      value: "Sett frakt på siste oppgjør",
      tone: "attention",
    })
  }

  const settlementRound = closedRounds[0] ?? null
  if (settlementRound) {
    const unpaidCount = settlementRound.orders.filter(
      (order) => !order.paid
    ).length
    const uncollectedCount = settlementRound.orders.filter(
      (order) => !order.collected
    ).length

    if (unpaidCount > 0) {
      queue.push({
        label: "Ikke betalt",
        value: formatOrderCount(unpaidCount),
        tone: "attention",
      })
    }

    if (uncollectedCount > 0) {
      queue.push({
        label: "Ikke hentet",
        value: formatOrderCount(uncollectedCount),
        tone: "attention",
      })
    }
  }

  if (queue.length === 0) {
    queue.push({
      label: "Ingen åpne punkter",
      value: "Alt ser ryddig ut",
      tone: "neutral",
    })
  }

  return queue.slice(0, 4)
}

function getRoundStatusLabel(status: string) {
  if (status === "open") return "Aktiv"
  if (status === "ready") return "Klar for henting"
  return "Lukket"
}

function getRoundCardDate(round: AdminRound) {
  const value = round.status === "open" ? round.closesAt : round.closedAt
  return value ? new Date(value) : new Date(round.openedAt ?? 0)
}

function formatQueueDate(value: Date | string) {
  return new Intl.DateTimeFormat("nb-NO", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value))
}

function formatOrderCount(count: number) {
  return `${count} ${count === 1 ? "ordre" : "ordre"}`
}
