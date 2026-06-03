import { describe, expect, test } from "vitest"
import {
  getAdminActionQueue,
  getDefaultBulkOrderExpanded,
  getDefaultOrderExpanded,
  getRoundArchiveSections,
  sortAdminOrderTotals,
  summarizeAdminRound,
} from "./admin-rounds"

describe("summarizeAdminRound", () => {
  test("creates a compact summary for a round card", () => {
    const summary = summarizeAdminRound({
      id: "round-1",
      status: "ready",
      openedAt: new Date("2026-05-01T10:00:00Z"),
      closedAt: new Date("2026-05-02T10:00:00Z"),
      closesAt: null,
      supplier: { name: "Solberg & Hansen" },
      orders: [
        {
          paid: true,
          collected: false,
          items: [{ quantity: 2 }, { quantity: 1 }],
        },
        {
          paid: false,
          collected: true,
          items: [{ quantity: 3 }],
        },
      ],
    })

    expect(summary).toEqual({
      id: "round-1",
      supplierName: "Solberg & Hansen",
      statusLabel: "Klar for henting",
      date: new Date("2026-05-02T10:00:00Z"),
      orderCount: 2,
      bagCount: 6,
      paidCount: 1,
      collectedCount: 1,
    })
  })

  test("uses the closing deadline as the card date for open rounds", () => {
    const summary = summarizeAdminRound({
      id: "round-2",
      status: "open",
      openedAt: new Date("2026-05-01T10:00:00Z"),
      closedAt: null,
      closesAt: new Date("2026-05-04T18:00:00Z"),
      supplier: null,
      orders: [],
    })

    expect(summary.supplierName).toBe("Ukjent")
    expect(summary.statusLabel).toBe("Aktiv")
    expect(summary.date).toEqual(new Date("2026-05-04T18:00:00Z"))
  })
})

describe("getRoundArchiveSections", () => {
  test("lifts the first round as latest and keeps the rest for archive", () => {
    const sections = getRoundArchiveSections([
      { id: "latest", status: "ready" },
      { id: "old-1", status: "closed" },
      { id: "old-2", status: "closed" },
    ])

    expect(sections.latestRound?.id).toBe("latest")
    expect(sections.archivedRounds.map((round) => round.id)).toEqual([
      "old-1",
      "old-2",
    ])
  })

  test("handles no rounds", () => {
    expect(getRoundArchiveSections([])).toEqual({
      latestRound: null,
      archivedRounds: [],
    })
  })
})

describe("getDefaultOrderExpanded", () => {
  test("collapses orders by default", () => {
    expect(getDefaultOrderExpanded()).toBe(false)
  })
})

describe("getDefaultBulkOrderExpanded", () => {
  test("collapses the aggregate order by default", () => {
    expect(getDefaultBulkOrderExpanded()).toBe(false)
  })
})

describe("sortAdminOrderTotals", () => {
  test("groups uncollected first and sorts paid before unpaid within each group", () => {
    const sorted = sortAdminOrderTotals([
      {
        orderId: "collected-paid",
        customerName: "B",
        collected: true,
        paid: true,
      },
      {
        orderId: "open-unpaid",
        customerName: "C",
        collected: false,
        paid: false,
      },
      { orderId: "open-paid", customerName: "A", collected: false, paid: true },
      {
        orderId: "collected-unpaid",
        customerName: "D",
        collected: true,
        paid: false,
      },
    ])

    expect(sorted.map((order) => order.orderId)).toEqual([
      "open-paid",
      "open-unpaid",
      "collected-paid",
      "collected-unpaid",
    ])
  })
})

describe("getAdminActionQueue", () => {
  test("prioritizes open round deadlines and missing setup", () => {
    const items = getAdminActionQueue({
      openRound: {
        status: "open",
        closesAt: new Date("2026-05-04T18:00:00Z"),
        shippingKr: 0,
        pickupInstructions: "",
        orders: [],
      },
      closedRounds: [],
    })

    expect(items).toEqual([
      {
        label: "Runde stenger",
        value: "4. mai 2026, 20:00",
        tone: "active",
      },
      {
        label: "Henteinfo mangler",
        value: "Legg inn tekst før oppgjør",
        tone: "attention",
      },
    ])
  })

  test("surfaces unpaid and uncollected closed round work", () => {
    const items = getAdminActionQueue({
      openRound: null,
      closedRounds: [
        {
          status: "ready",
          closesAt: null,
          shippingKr: 79,
          pickupInstructions: "Hentes hos K.",
          orders: [
            { paid: false, collected: false, items: [] },
            { paid: true, collected: false, items: [] },
          ],
        },
      ],
    })

    expect(items).toEqual([
      { label: "Ikke betalt", value: "1 ordre", tone: "attention" },
      { label: "Ikke hentet", value: "2 ordre", tone: "attention" },
    ])
  })
})
