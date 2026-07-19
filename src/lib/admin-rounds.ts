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

type CoffeeHistoryRound = {
  closedAt: Date | string | null
  coffees: Array<{ coffeeId: string; nameSnapshot: string }>
  orders: Array<{ items: Array<{ name: string; quantity: number }> }>
}

export type CoffeeOrderHistory = {
  totalOrders: number
  totalBags: number
  previousOrders: number
  previousBags: number
}

/**
 * Aggregates historical demand per coffee from closed rounds so the admin can
 * see, at a glance when opening a new round, how each coffee has sold. Returns
 * a map keyed by coffee id with the all-time totals and the figures from the
 * most recent round in which that coffee was offered ("forrige").
 */
export function summarizeCoffeeOrderHistory<TRound extends CoffeeHistoryRound>(
  rounds: Array<TRound>
): Map<string, CoffeeOrderHistory> {
  const sortedRounds = [...rounds].sort(
    (left, right) => getRoundTime(right.closedAt) - getRoundTime(left.closedAt)
  )

  const history = new Map<string, CoffeeOrderHistory>()
  const previousAssigned = new Set<string>()

  for (const round of sortedRounds) {
    const coffeeIdByName = new Map(
      round.coffees.map((coffee) => [coffee.nameSnapshot, coffee.coffeeId])
    )
    const roundBags = new Map<string, number>()
    const roundOrders = new Map<string, number>()

    for (const order of round.orders) {
      const seenInOrder = new Set<string>()
      for (const item of order.items) {
        if (item.quantity <= 0) continue
        const coffeeId = coffeeIdByName.get(item.name)
        if (!coffeeId) continue
        roundBags.set(coffeeId, (roundBags.get(coffeeId) ?? 0) + item.quantity)
        seenInOrder.add(coffeeId)
      }
      for (const coffeeId of seenInOrder) {
        roundOrders.set(coffeeId, (roundOrders.get(coffeeId) ?? 0) + 1)
      }
    }

    for (const coffee of round.coffees) {
      const bags = roundBags.get(coffee.coffeeId) ?? 0
      const orders = roundOrders.get(coffee.coffeeId) ?? 0
      const entry = history.get(coffee.coffeeId) ?? {
        totalOrders: 0,
        totalBags: 0,
        previousOrders: 0,
        previousBags: 0,
      }
      entry.totalOrders += orders
      entry.totalBags += bags
      if (!previousAssigned.has(coffee.coffeeId)) {
        entry.previousOrders = orders
        entry.previousBags = bags
        previousAssigned.add(coffee.coffeeId)
      }
      history.set(coffee.coffeeId, entry)
    }
  }

  return history
}

export function getRoundArchiveSections<TRound>(rounds: Array<TRound>) {
  const [latestRound, ...archivedRounds] = rounds

  return {
    latestRound: latestRound ?? null,
    archivedRounds,
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
  const latestClosedRound = closedRounds.at(0) ?? null
  const operationalRound = openRound ?? latestClosedRound

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

  const settlementRound = latestClosedRound
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

function getRoundTime(value: Date | string | null) {
  if (!value) return 0
  const time = new Date(value).getTime()
  return Number.isFinite(time) ? time : 0
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
