import { bagsToGrams, formatGrams } from "./coffee-units"
import { addCoffeeVat } from "./vat"

// ----- Input (already filtered to completed rounds, Dates serialized to ISO) -----

export type LeaderboardItemInput = {
  name: string
  quantity: number
  priceKr: number
}

export type LeaderboardOrderInput = {
  id: string
  customerId: string | null
  customerName: string
  createdAt: string // ISO
  items: Array<LeaderboardItemInput>
}

export type LeaderboardRoundInput = {
  roundId: string
  supplierName: string
  closedAt: string | null // ISO
  orders: Array<LeaderboardOrderInput>
}

export type LeaderboardInput = {
  rounds: Array<LeaderboardRoundInput>
}

// ----- Output -----

export type CoffeeTypeShare = {
  name: string
  grams: number
  bags: number
  share: number // 0..1 of the member's total grams
}

export type MemberAggregate = {
  memberKey: string
  customerId: string | null
  customerName: string
  totalGrams: number
  totalBags: number
  totalKr: number // VAT-inclusive
  roundsParticipated: number
  distinctCoffeeTypes: number
  coffeeBreakdown: Array<CoffeeTypeShare> // grams desc
  biggestSingleOrderGrams: number
  biggestSingleOrderRoundId: string | null
  firstRoundClosedAt: string | null
  lastRoundClosedAt: string | null
}

export type RankingEntry = MemberAggregate & { rank: number }

export type BadgeMember = { memberKey: string; customerName: string }

export type BadgeId =
  | "climber"
  | "diverse"
  | "loyal"
  | "spender"
  | "regular"
  | "biggest-order"
  | "early-bird"
  | "newcomer"

export type Badge = {
  id: BadgeId
  title: string
  description: string
  winners: Array<BadgeMember>
  stat: string | null
  available: boolean
}

export type GramsPerRoundPoint = {
  roundId: string
  label: string
  closedAt: string | null
  grams: number
}

export type CoffeePopularityPoint = {
  name: string
  grams: number
  bags: number
}

export type MemberCoffeeDistribution = {
  memberKey: string
  customerName: string
  byCoffee: Array<{ name: string; grams: number }>
}

export type LeaderboardCharts = {
  gramsPerRound: Array<GramsPerRoundPoint>
  coffeePopularity: Array<CoffeePopularityPoint>
  memberDistribution: Array<MemberCoffeeDistribution>
}

export type LeaderboardTotals = {
  totalGramsAllTime: number
  completedRoundsCount: number
  participantsCount: number
}

export type LeaderboardResult = {
  ranking: Array<RankingEntry>
  podium: Array<RankingEntry>
  badges: Array<Badge>
  charts: LeaderboardCharts
  totals: LeaderboardTotals
}

// "Most loyal" only makes sense once someone has ordered a meaningful amount.
const LOYAL_MIN_GRAMS = 1000

// ----- Helpers -----

function memberKeyFor(order: LeaderboardOrderInput) {
  return (
    order.customerId ??
    `name:${order.customerName.trim().toLocaleLowerCase("nb-NO")}`
  )
}

function gramsForItem(item: LeaderboardItemInput) {
  return bagsToGrams(Math.max(0, item.quantity))
}

function krForItem(item: LeaderboardItemInput) {
  return addCoffeeVat(Math.max(0, item.quantity) * item.priceKr)
}

function roundTime(closedAt: string | null) {
  const parsed = closedAt ? Date.parse(closedAt) : NaN
  return Number.isNaN(parsed) ? 0 : parsed
}

function compareNames(left: string, right: string) {
  return left.localeCompare(right, "nb-NO")
}

/** Rounds sorted newest-first by closedAt (ties keep input order). */
function roundsNewestFirst(input: LeaderboardInput) {
  return [...input.rounds].sort(
    (left, right) => roundTime(right.closedAt) - roundTime(left.closedAt)
  )
}

/** Member -> grams ordered within a single round. */
function gramsByMemberForRound(round: LeaderboardRoundInput) {
  const grams = new Map<string, number>()
  for (const order of round.orders) {
    const key = memberKeyFor(order)
    const orderGrams = order.items.reduce(
      (sum, item) => sum + gramsForItem(item),
      0
    )
    if (orderGrams <= 0) continue
    grams.set(key, (grams.get(key) ?? 0) + orderGrams)
  }
  return grams
}

// ----- Aggregates -----

export function computeMemberAggregates(
  input: LeaderboardInput
): Array<MemberAggregate> {
  type Working = {
    memberKey: string
    customerId: string | null
    customerName: string
    latestNameAt: number
    totalGrams: number
    totalBags: number
    totalKr: number
    rounds: Set<string>
    coffeeGrams: Map<string, { grams: number; bags: number }>
    biggestSingleOrderGrams: number
    biggestSingleOrderRoundId: string | null
    firstRoundTime: number
    firstRoundClosedAt: string | null
    lastRoundTime: number
    lastRoundClosedAt: string | null
  }

  const byMember = new Map<string, Working>()

  for (const round of input.rounds) {
    const time = roundTime(round.closedAt)
    for (const order of round.orders) {
      const key = memberKeyFor(order)
      let member = byMember.get(key)
      if (!member) {
        member = {
          memberKey: key,
          customerId: order.customerId,
          customerName: order.customerName,
          latestNameAt: Number.NEGATIVE_INFINITY,
          totalGrams: 0,
          totalBags: 0,
          totalKr: 0,
          rounds: new Set(),
          coffeeGrams: new Map(),
          biggestSingleOrderGrams: 0,
          biggestSingleOrderRoundId: null,
          firstRoundTime: Number.POSITIVE_INFINITY,
          firstRoundClosedAt: null,
          lastRoundTime: Number.NEGATIVE_INFINITY,
          lastRoundClosedAt: null,
        }
        byMember.set(key, member)
      }

      const createdAt = Date.parse(order.createdAt)
      const createdTime = Number.isNaN(createdAt) ? 0 : createdAt
      if (createdTime >= member.latestNameAt) {
        member.latestNameAt = createdTime
        member.customerName = order.customerName
        member.customerId = order.customerId
      }

      let orderGrams = 0
      for (const item of order.items) {
        const grams = gramsForItem(item)
        if (grams <= 0) continue
        orderGrams += grams
        member.totalGrams += grams
        member.totalBags += Math.max(0, item.quantity)
        member.totalKr += krForItem(item)
        const existing = member.coffeeGrams.get(item.name) ?? {
          grams: 0,
          bags: 0,
        }
        member.coffeeGrams.set(item.name, {
          grams: existing.grams + grams,
          bags: existing.bags + Math.max(0, item.quantity),
        })
      }

      if (orderGrams <= 0) continue
      member.rounds.add(round.roundId)
      if (orderGrams > member.biggestSingleOrderGrams) {
        member.biggestSingleOrderGrams = orderGrams
        member.biggestSingleOrderRoundId = round.roundId
      }
      if (time < member.firstRoundTime) {
        member.firstRoundTime = time
        member.firstRoundClosedAt = round.closedAt
      }
      if (time > member.lastRoundTime) {
        member.lastRoundTime = time
        member.lastRoundClosedAt = round.closedAt
      }
    }
  }

  return Array.from(byMember.values()).map((member) => {
    const coffeeBreakdown: Array<CoffeeTypeShare> = Array.from(
      member.coffeeGrams.entries()
    )
      .map(([name, value]) => ({
        name,
        grams: value.grams,
        bags: value.bags,
        share: member.totalGrams > 0 ? value.grams / member.totalGrams : 0,
      }))
      .sort(
        (left, right) =>
          right.grams - left.grams || compareNames(left.name, right.name)
      )

    return {
      memberKey: member.memberKey,
      customerId: member.customerId,
      customerName: member.customerName,
      totalGrams: member.totalGrams,
      totalBags: member.totalBags,
      totalKr: member.totalKr,
      roundsParticipated: member.rounds.size,
      distinctCoffeeTypes: coffeeBreakdown.length,
      coffeeBreakdown,
      biggestSingleOrderGrams: member.biggestSingleOrderGrams,
      biggestSingleOrderRoundId: member.biggestSingleOrderRoundId,
      firstRoundClosedAt: member.firstRoundClosedAt,
      lastRoundClosedAt: member.lastRoundClosedAt,
    }
  })
}

// ----- Ranking -----

export function computeRanking(
  aggregates: Array<MemberAggregate>
): Array<RankingEntry> {
  return aggregates
    .filter((member) => member.totalGrams > 0)
    .sort(
      (left, right) =>
        right.totalGrams - left.totalGrams ||
        right.totalKr - left.totalKr ||
        compareNames(left.customerName, right.customerName)
    )
    .map((member, index) => ({ ...member, rank: index + 1 }))
}

// ----- Badges -----

function toBadgeMember(member: {
  memberKey: string
  customerName: string
}): BadgeMember {
  return { memberKey: member.memberKey, customerName: member.customerName }
}

function emptyBadge(id: BadgeId, title: string, description: string): Badge {
  return { id, title, description, winners: [], stat: null, available: false }
}

function formatPercent(share: number) {
  return `${Math.round(share * 100)} %`
}

export function computeBadges(
  input: LeaderboardInput,
  aggregates: Array<MemberAggregate>
): Array<Badge> {
  const participants = aggregates.filter((member) => member.totalGrams > 0)
  const ordered = roundsNewestFirst(input)
  const completedRounds = ordered.length

  const climber = ((): Badge => {
    const badge = emptyBadge(
      "climber",
      "Største klatrer",
      "Mest fremgang siden forrige runde"
    )
    if (completedRounds < 2) return badge
    const latest = gramsByMemberForRound(ordered[0])
    const previous = gramsByMemberForRound(ordered[1])
    let bestDelta = 0
    let winners: Array<BadgeMember> = []
    for (const member of participants) {
      const delta =
        (latest.get(member.memberKey) ?? 0) -
        (previous.get(member.memberKey) ?? 0)
      if (delta <= 0) continue
      if (delta > bestDelta) {
        bestDelta = delta
        winners = [toBadgeMember(member)]
      } else if (delta === bestDelta) {
        winners.push(toBadgeMember(member))
      }
    }
    if (winners.length === 0) return badge
    return {
      ...badge,
      winners,
      stat: `+${formatGrams(bestDelta)}`,
      available: true,
    }
  })()

  const diverse = ((): Badge => {
    const badge = emptyBadge(
      "diverse",
      "Mest variert",
      "Flest ulike kaffesorter"
    )
    const maxTypes = participants.reduce(
      (max, member) => Math.max(max, member.distinctCoffeeTypes),
      0
    )
    if (maxTypes < 2) return badge
    const winners = participants
      .filter((member) => member.distinctCoffeeTypes === maxTypes)
      .sort((left, right) => right.totalGrams - left.totalGrams)
      .map(toBadgeMember)
    return {
      ...badge,
      winners,
      stat: `${maxTypes} sorter`,
      available: true,
    }
  })()

  const loyal = ((): Badge => {
    const badge = emptyBadge(
      "loyal",
      "Mest trofast",
      "Holder seg til én favoritt"
    )
    const eligible = participants.filter(
      (member) => member.totalGrams >= LOYAL_MIN_GRAMS
    )
    if (eligible.length === 0) return badge
    let best: { member: MemberAggregate; share: number; name: string } | null =
      null
    for (const member of eligible) {
      if (member.coffeeBreakdown.length === 0) continue
      const top = member.coffeeBreakdown[0]
      if (!best || top.share > best.share) {
        best = { member, share: top.share, name: top.name }
      }
    }
    if (!best) return badge
    return {
      ...badge,
      winners: [toBadgeMember(best.member)],
      stat: `${formatPercent(best.share)} ${best.name}`,
      available: true,
    }
  })()

  const spender = ((): Badge => {
    const badge = emptyBadge(
      "spender",
      "Storforbruker",
      "Mest brukt i kroner totalt"
    )
    if (participants.length === 0) return badge
    const max = Math.max(...participants.map((member) => member.totalKr))
    if (max <= 0) return badge
    const winners = participants
      .filter((member) => member.totalKr === max)
      .map(toBadgeMember)
    return { ...badge, winners, stat: `${max} kr`, available: true }
  })()

  const regular = ((): Badge => {
    const badge = emptyBadge("regular", "Stamgjest", "Med på flest runder")
    const maxRounds = participants.reduce(
      (max, member) => Math.max(max, member.roundsParticipated),
      0
    )
    if (maxRounds < 2) return badge
    const winners = participants
      .filter((member) => member.roundsParticipated === maxRounds)
      .sort((left, right) => right.totalGrams - left.totalGrams)
      .map(toBadgeMember)
    return {
      ...badge,
      winners,
      stat: `${maxRounds} runder`,
      available: true,
    }
  })()

  const biggestOrder = ((): Badge => {
    const badge = emptyBadge(
      "biggest-order",
      "Største enkeltordre",
      "Den heftigste bestillingen"
    )
    if (participants.length === 0) return badge
    const max = Math.max(
      ...participants.map((member) => member.biggestSingleOrderGrams)
    )
    if (max <= 0) return badge
    const winners = participants
      .filter((member) => member.biggestSingleOrderGrams === max)
      .map(toBadgeMember)
    return { ...badge, winners, stat: formatGrams(max), available: true }
  })()

  const earlyBird = ((): Badge => {
    const badge = emptyBadge(
      "early-bird",
      "Tidlig ute",
      "Først til å bestille i siste runde"
    )
    if (ordered.length === 0) return badge
    const latestRound = ordered[0]
    if (latestRound.orders.length < 2) return badge
    const sorted = [...latestRound.orders]
      .filter((order) => order.items.some((item) => item.quantity > 0))
      .sort(
        (left, right) =>
          Date.parse(left.createdAt) - Date.parse(right.createdAt)
      )
    if (sorted.length === 0) return badge
    const first = sorted[0]
    const winner = participants.find(
      (member) => member.memberKey === memberKeyFor(first)
    )
    if (!winner) return badge
    return {
      ...badge,
      winners: [toBadgeMember(winner)],
      stat: latestRound.supplierName,
      available: true,
    }
  })()

  const newcomer = ((): Badge => {
    const badge = emptyBadge("newcomer", "Nykommer", "Debuterte i siste runde")
    if (completedRounds < 2) return badge
    const latestTime = roundTime(ordered[0].closedAt)
    const winners = participants
      .filter(
        (member) =>
          member.firstRoundClosedAt !== null &&
          roundTime(member.firstRoundClosedAt) === latestTime
      )
      .sort((left, right) => right.totalGrams - left.totalGrams)
      .map(toBadgeMember)
    if (winners.length === 0) return badge
    return { ...badge, winners, stat: null, available: true }
  })()

  return [
    climber,
    diverse,
    loyal,
    spender,
    regular,
    biggestOrder,
    earlyBird,
    newcomer,
  ]
}

// ----- Charts -----

export function computeChartData(
  input: LeaderboardInput,
  aggregates: Array<MemberAggregate>
): LeaderboardCharts {
  const gramsPerRound: Array<GramsPerRoundPoint> = [...input.rounds]
    .sort((left, right) => roundTime(left.closedAt) - roundTime(right.closedAt))
    .map((round) => {
      const grams = round.orders.reduce(
        (sum, order) =>
          sum +
          order.items.reduce(
            (itemSum, item) => itemSum + gramsForItem(item),
            0
          ),
        0
      )
      return {
        roundId: round.roundId,
        label: roundLabel(round),
        closedAt: round.closedAt,
        grams,
      }
    })

  const popularity = new Map<string, { grams: number; bags: number }>()
  for (const round of input.rounds) {
    for (const order of round.orders) {
      for (const item of order.items) {
        const grams = gramsForItem(item)
        if (grams <= 0) continue
        const existing = popularity.get(item.name) ?? { grams: 0, bags: 0 }
        popularity.set(item.name, {
          grams: existing.grams + grams,
          bags: existing.bags + Math.max(0, item.quantity),
        })
      }
    }
  }
  const coffeePopularity: Array<CoffeePopularityPoint> = Array.from(
    popularity.entries()
  )
    .map(([name, value]) => ({ name, grams: value.grams, bags: value.bags }))
    .sort(
      (left, right) =>
        right.grams - left.grams || compareNames(left.name, right.name)
    )

  const memberDistribution: Array<MemberCoffeeDistribution> = aggregates
    .filter((member) => member.totalGrams > 0)
    .map((member) => ({
      memberKey: member.memberKey,
      customerName: member.customerName,
      byCoffee: member.coffeeBreakdown.map((entry) => ({
        name: entry.name,
        grams: entry.grams,
      })),
    }))

  return { gramsPerRound, coffeePopularity, memberDistribution }
}

function roundLabel(round: LeaderboardRoundInput) {
  if (!round.closedAt) return round.supplierName
  const date = new Date(round.closedAt)
  if (Number.isNaN(date.getTime())) return round.supplierName
  const formatted = date.toLocaleDateString("nb-NO", {
    day: "numeric",
    month: "short",
  })
  return `${round.supplierName} · ${formatted}`
}

// ----- Orchestrator -----

export function buildLeaderboard(input: LeaderboardInput): LeaderboardResult {
  const aggregates = computeMemberAggregates(input)
  const ranking = computeRanking(aggregates)
  const badges = computeBadges(input, aggregates)
  const charts = computeChartData(input, aggregates)

  return {
    ranking,
    podium: ranking.slice(0, 3),
    badges,
    charts,
    totals: {
      totalGramsAllTime: ranking.reduce(
        (sum, member) => sum + member.totalGrams,
        0
      ),
      completedRoundsCount: input.rounds.length,
      participantsCount: ranking.length,
    },
  }
}
