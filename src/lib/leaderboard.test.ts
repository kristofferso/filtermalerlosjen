import { describe, expect, it } from "vitest"
import {
  buildLeaderboard,
  computeBadges,
  computeMemberAggregates,
  computeRanking,
} from "./leaderboard"
import type { LeaderboardInput } from "./leaderboard"

function order(
  id: string,
  customerId: string | null,
  customerName: string,
  createdAt: string,
  items: Array<{ name: string; quantity: number; priceKr: number }>
) {
  return { id, customerId, customerName, createdAt, items }
}

const twoRounds: LeaderboardInput = {
  rounds: [
    {
      roundId: "r2",
      supplierName: "Tim Wendelboe",
      closedAt: "2026-05-01T10:00:00.000Z",
      orders: [
        order("o3", "c1", "Anna", "2026-04-20T08:00:00.000Z", [
          { name: "Kenya", quantity: 8, priceKr: 100 }, // 2000 g
        ]),
        order("o4", "c2", "Bjørn", "2026-04-20T09:00:00.000Z", [
          { name: "Brazil", quantity: 2, priceKr: 120 }, // 500 g
          { name: "Kenya", quantity: 2, priceKr: 100 }, // 500 g
        ]),
        order("o5", "c3", "Cecilie", "2026-04-20T07:00:00.000Z", [
          { name: "Etiopia", quantity: 1, priceKr: 130 }, // 250 g
        ]),
      ],
    },
    {
      roundId: "r1",
      supplierName: "Solberg & Hansen",
      closedAt: "2026-03-01T10:00:00.000Z",
      orders: [
        order("o1", "c1", "Anna", "2026-02-20T08:00:00.000Z", [
          { name: "Kenya", quantity: 4, priceKr: 100 }, // 1000 g
        ]),
        order("o2", "c2", "Bjørn", "2026-02-20T09:00:00.000Z", [
          { name: "Brazil", quantity: 4, priceKr: 120 }, // 1000 g
        ]),
      ],
    },
  ],
}

describe("computeMemberAggregates", () => {
  it("sums grams, bags and VAT-inclusive kr across rounds", () => {
    const aggregates = computeMemberAggregates(twoRounds)
    const anna = aggregates.find((m) => m.customerId === "c1")
    expect(anna).toBeDefined()
    expect(anna?.totalBags).toBe(12)
    expect(anna?.totalGrams).toBe(3000)
    expect(anna?.roundsParticipated).toBe(2)
    expect(anna?.distinctCoffeeTypes).toBe(1)
    // kr: round2 8*100 + round1 4*100 = 800kr + 400kr, each +15% VAT (ceil per item)
    expect(anna?.totalKr).toBe(Math.ceil(800 * 1.15) + Math.ceil(400 * 1.15))
  })

  it("tracks coffee breakdown shares and biggest single order", () => {
    const aggregates = computeMemberAggregates(twoRounds)
    const bjorn = aggregates.find((m) => m.customerId === "c2")
    // Bjørn: Brazil 1000+500=1500, Kenya 500 -> total 2000
    expect(bjorn?.totalGrams).toBe(2000)
    expect(bjorn?.coffeeBreakdown[0]).toEqual({
      name: "Brazil",
      grams: 1500,
      bags: 6,
      share: 0.75,
    })
    expect(bjorn?.biggestSingleOrderGrams).toBe(1000)
  })

  it("groups orders without customerId by normalized name", () => {
    const input: LeaderboardInput = {
      rounds: [
        {
          roundId: "r1",
          supplierName: "S",
          closedAt: "2026-01-01T00:00:00.000Z",
          orders: [
            order("o1", null, "Guest", "2026-01-01T00:00:00.000Z", [
              { name: "Kenya", quantity: 1, priceKr: 100 },
            ]),
            order("o2", null, "guest", "2026-01-01T01:00:00.000Z", [
              { name: "Kenya", quantity: 1, priceKr: 100 },
            ]),
          ],
        },
      ],
    }
    const aggregates = computeMemberAggregates(input)
    expect(aggregates).toHaveLength(1)
    expect(aggregates[0].totalBags).toBe(2)
  })

  it("skips zero-quantity items", () => {
    const input: LeaderboardInput = {
      rounds: [
        {
          roundId: "r1",
          supplierName: "S",
          closedAt: "2026-01-01T00:00:00.000Z",
          orders: [
            order("o1", "c1", "Anna", "2026-01-01T00:00:00.000Z", [
              { name: "Kenya", quantity: 0, priceKr: 100 },
            ]),
          ],
        },
      ],
    }
    const aggregates = computeMemberAggregates(input)
    expect(aggregates[0].totalGrams).toBe(0)
  })
})

describe("computeRanking", () => {
  it("ranks by grams desc with sequential ranks and excludes zero-gram members", () => {
    const ranking = computeRanking(computeMemberAggregates(twoRounds))
    expect(ranking.map((entry) => [entry.customerName, entry.rank])).toEqual([
      ["Anna", 1], // 3000
      ["Bjørn", 2], // 2000
      ["Cecilie", 3], // 250
    ])
  })
})

describe("computeBadges", () => {
  it("awards the biggest climber between the two latest rounds", () => {
    const aggregates = computeMemberAggregates(twoRounds)
    const badges = computeBadges(twoRounds, aggregates)
    const climber = badges.find((b) => b.id === "climber")
    expect(climber?.available).toBe(true)
    // Anna: 2000 (r2) - 1000 (r1) = +1000; Bjørn: 1000-1000=0; Cecilie new.
    expect(climber?.winners.map((w) => w.customerName)).toEqual(["Anna"])
    expect(climber?.stat).toBe("+1,0 kg")
  })

  it("marks comparative badges unavailable with a single round", () => {
    const single: LeaderboardInput = { rounds: [twoRounds.rounds[1]] }
    const badges = computeBadges(single, computeMemberAggregates(single))
    expect(badges.find((b) => b.id === "climber")?.available).toBe(false)
    expect(badges.find((b) => b.id === "newcomer")?.available).toBe(false)
    expect(badges.find((b) => b.id === "regular")?.available).toBe(false)
  })

  it("awards most loyal only to members above the gram threshold", () => {
    const aggregates = computeMemberAggregates(twoRounds)
    const loyal = computeBadges(twoRounds, aggregates).find(
      (b) => b.id === "loyal"
    )
    // Anna is 100% Kenya with 3000 g (>= 1000), Cecilie only 250 g (excluded).
    expect(loyal?.available).toBe(true)
    expect(loyal?.winners.map((w) => w.customerName)).toEqual(["Anna"])
    expect(loyal?.stat).toBe("100 % Kenya")
  })

  it("awards most diverse only when someone has 2+ types", () => {
    const aggregates = computeMemberAggregates(twoRounds)
    const diverse = computeBadges(twoRounds, aggregates).find(
      (b) => b.id === "diverse"
    )
    expect(diverse?.available).toBe(true)
    expect(diverse?.winners.map((w) => w.customerName)).toEqual(["Bjørn"])
    expect(diverse?.stat).toBe("2 sorter")
  })

  it("marks newcomers who debuted in the latest round", () => {
    const aggregates = computeMemberAggregates(twoRounds)
    const newcomer = computeBadges(twoRounds, aggregates).find(
      (b) => b.id === "newcomer"
    )
    expect(newcomer?.winners.map((w) => w.customerName)).toEqual(["Cecilie"])
  })

  it("awards early bird to the first order in the latest round", () => {
    const aggregates = computeMemberAggregates(twoRounds)
    const earlyBird = computeBadges(twoRounds, aggregates).find(
      (b) => b.id === "early-bird"
    )
    // Cecilie ordered at 07:00, earliest in r2.
    expect(earlyBird?.winners.map((w) => w.customerName)).toEqual(["Cecilie"])
  })
})

describe("buildLeaderboard", () => {
  it("returns podium, chronological chart data and totals", () => {
    const result = buildLeaderboard(twoRounds)
    expect(result.podium.map((p) => p.customerName)).toEqual([
      "Anna",
      "Bjørn",
      "Cecilie",
    ])
    expect(result.totals.completedRoundsCount).toBe(2)
    expect(result.totals.participantsCount).toBe(3)
    expect(result.totals.totalGramsAllTime).toBe(5250)
    // gramsPerRound chronological: r1 (older) then r2.
    expect(result.charts.gramsPerRound.map((g) => g.roundId)).toEqual([
      "r1",
      "r2",
    ])
    expect(result.charts.coffeePopularity[0].name).toBe("Kenya") // 3000 g total
  })

  it("handles zero completed rounds without crashing", () => {
    const result = buildLeaderboard({ rounds: [] })
    expect(result.ranking).toEqual([])
    expect(result.podium).toEqual([])
    expect(result.totals.totalGramsAllTime).toBe(0)
    expect(result.badges.every((b) => !b.available)).toBe(true)
  })
})
