import { describe, expect, test } from "vitest"
import {
  fetchPickupSlotsFromIcsCalendar,
  getNextPickupWindowSelections,
  getPickupSlotLabel,
  groupPickupSlotsByDate,
  parsePickupSlotsFromIcs,
} from "./pickup-slots"

const NOW = new Date("2026-06-02T10:00:00+02:00")

describe("parsePickupSlotsFromIcs", () => {
  test("builds pickup slots from matching iCal events using dynamic start and end times", () => {
    const slots = parsePickupSlotsFromIcs(
      `BEGIN:VCALENDAR
BEGIN:VEVENT
UID:pickup-1
SUMMARY:Henting
DTSTART:20260604T160000Z
DTEND:20260604T180000Z
END:VEVENT
BEGIN:VEVENT
UID:meeting-1
SUMMARY:Dinner
DTSTART:20260605T160000Z
DTEND:20260605T180000Z
END:VEVENT
END:VCALENDAR`,
      { now: NOW, keyword: "Henting", maxDaysAhead: 10 }
    )

    expect(slots).toEqual([
      {
        id: "pickup-1-2026-06-04T16:00:00.000Z-2026-06-04T18:00:00.000Z",
        startsAt: "2026-06-04T16:00:00.000Z",
        endsAt: "2026-06-04T18:00:00.000Z",
        dateLabel: "torsdag 4. juni",
        timeLabel: "18:00–20:00",
        label: "torsdag 4. juni, 18:00–20:00",
      },
    ])
  })

  test("matches pickup keyword case-insensitively anywhere in the event title", () => {
    const slots = parsePickupSlotsFromIcs(
      `BEGIN:VCALENDAR
BEGIN:VEVENT
UID:pickup-lowercase
SUMMARY:kaffe henting ved inngangen
DTSTART:20260604T160000Z
DTEND:20260604T180000Z
END:VEVENT
END:VCALENDAR`,
      { now: NOW, keyword: "HENTING", maxDaysAhead: 10 }
    )

    expect(slots.map((slot) => slot.id)).toEqual([
      "pickup-lowercase-2026-06-04T16:00:00.000Z-2026-06-04T18:00:00.000Z",
    ])
  })

  test("creates unique slot ids for multiple occurrences with the same iCal uid", () => {
    const slots = parsePickupSlotsFromIcs(
      `BEGIN:VCALENDAR
BEGIN:VEVENT
UID:repeated-pickup
SUMMARY:Henting
DTSTART:20260604T160000Z
DTEND:20260604T170000Z
END:VEVENT
BEGIN:VEVENT
UID:repeated-pickup
SUMMARY:Henting
DTSTART:20260604T180000Z
DTEND:20260604T190000Z
END:VEVENT
END:VCALENDAR`,
      { now: NOW, keyword: "Henting", maxDaysAhead: 10 }
    )

    expect(slots.map((slot) => slot.timeLabel)).toEqual([
      "18:00–19:00",
      "20:00–21:00",
    ])
    expect(new Set(slots.map((slot) => slot.id)).size).toBe(2)
  })

  test("excludes events outside the future window and invalid zero-length events", () => {
    const slots = parsePickupSlotsFromIcs(
      `BEGIN:VCALENDAR
BEGIN:VEVENT
UID:past
SUMMARY:Henting
DTSTART:20260601T160000Z
DTEND:20260601T180000Z
END:VEVENT
BEGIN:VEVENT
UID:too-far
SUMMARY:Henting
DTSTART:20260620T160000Z
DTEND:20260620T180000Z
END:VEVENT
BEGIN:VEVENT
UID:invalid
SUMMARY:Henting
DTSTART:20260603T160000Z
DTEND:20260603T160000Z
END:VEVENT
BEGIN:VEVENT
UID:valid
SUMMARY:Henting
DTSTART:20260606T090000Z
DTEND:20260606T110000Z
END:VEVENT
END:VCALENDAR`,
      { now: NOW, keyword: "Henting", maxDaysAhead: 7 }
    )

    expect(slots.map((slot) => slot.id)).toEqual([
      "valid-2026-06-06T09:00:00.000Z-2026-06-06T11:00:00.000Z",
    ])
  })

  test("uses a stable fallback id when event uid is missing", () => {
    const [slot] = parsePickupSlotsFromIcs(
      `BEGIN:VCALENDAR
BEGIN:VEVENT
SUMMARY:[HENTING] ettermiddag
DTSTART:20260604T160000Z
DTEND:20260604T180000Z
END:VEVENT
END:VCALENDAR`,
      { now: NOW, keyword: "[HENTING]", maxDaysAhead: 10 }
    )

    expect(slot.id).toBe(
      "[HENTING] ettermiddag-2026-06-04T16:00:00.000Z-2026-06-04T18:00:00.000Z"
    )
  })
})

describe("pickup slot grouping helpers", () => {
  const slots = [
    {
      id: "slot-1",
      startsAt: "2026-06-04T16:00:00.000Z",
      endsAt: "2026-06-04T18:00:00.000Z",
      dateLabel: "torsdag 4. juni",
      timeLabel: "18:00–20:00",
      label: "torsdag 4. juni, 18:00–20:00",
    },
    {
      id: "slot-2",
      startsAt: "2026-06-04T18:00:00.000Z",
      endsAt: "2026-06-04T20:00:00.000Z",
      dateLabel: "torsdag 4. juni",
      timeLabel: "20:00–22:00",
      label: "torsdag 4. juni, 20:00–22:00",
    },
    {
      id: "slot-3",
      startsAt: "2026-06-05T16:00:00.000Z",
      endsAt: "2026-06-05T18:00:00.000Z",
      dateLabel: "fredag 5. juni",
      timeLabel: "18:00–20:00",
      label: "fredag 5. juni, 18:00–20:00",
    },
  ]

  test("groups slots by date for the customer picker", () => {
    expect(groupPickupSlotsByDate(slots)).toEqual([
      { dateLabel: "torsdag 4. juni", slots: [slots[0], slots[1]] },
      { dateLabel: "fredag 5. juni", slots: [slots[2]] },
    ])
  })

  test("returns the next two windows with selected pickup orders", () => {
    const windows = getNextPickupWindowSelections({
      slots,
      now: NOW,
      orders: [
        {
          id: "order-2",
          customerName: "Bente",
          pickupSlotId: "slot-1",
          collected: true,
          items: [{ quantity: 2 }],
        },
        {
          id: "order-1",
          customerName: "Anders",
          pickupSlotId: "slot-1",
          collected: false,
          items: [{ quantity: 1 }, { quantity: 3 }],
        },
        {
          id: "order-3",
          customerName: "Carina",
          pickupSlotId: "slot-3",
          collected: false,
          items: [{ quantity: 4 }],
        },
      ],
    })

    expect(windows).toHaveLength(2)
    expect(windows.map((window) => window.id)).toEqual(["slot-1", "slot-2"])
    expect(windows[0].orders.map((order) => order.customerName)).toEqual([
      "Anders",
      "Bente",
    ])
    expect(windows[0].orderCount).toBe(2)
    expect(windows[0].bagCount).toBe(6)
    expect(windows[1].orders).toEqual([])
  })

  test("uses saved pickup snapshots when the calendar slot is absent", () => {
    const windows = getNextPickupWindowSelections({
      slots: [],
      now: NOW,
      orders: [
        {
          id: "order-1",
          customerName: "Anders",
          pickupSlotId: "saved-slot",
          pickupStartsAt: new Date("2026-06-06T09:00:00.000Z"),
          pickupEndsAt: new Date("2026-06-06T11:00:00.000Z"),
          items: [{ quantity: 2 }],
        },
      ],
    })

    expect(windows).toMatchObject([
      {
        id: "saved-slot",
        label: "lørdag 6. juni, 11:00–13:00",
        orderCount: 1,
        bagCount: 2,
      },
    ])
  })
})

describe("fetchPickupSlotsFromIcsCalendar", () => {
  test("fetches webcal calendar URLs over https without cache", async () => {
    let fetchedUrl = ""
    let fetchedInit: RequestInit | undefined

    await fetchPickupSlotsFromIcsCalendar({
      url: "webcal://calendar.example.test/pickup.ics",
      keyword: "Henting",
      maxDaysAhead: 10,
      now: NOW,
      fetcher: (url, init) => {
        fetchedUrl = String(url)
        fetchedInit = init
        return Promise.resolve(new Response("BEGIN:VCALENDAR\nEND:VCALENDAR"))
      },
    })

    expect(fetchedUrl).toBe("https://calendar.example.test/pickup.ics")
    expect(fetchedInit).toEqual({
      cache: "no-store",
      headers: { "Cache-Control": "no-store" },
    })
  })

  test("returns no slots when the calendar fetch fails", async () => {
    const slots = await fetchPickupSlotsFromIcsCalendar({
      url: "https://calendar.example.test/pickup.ics",
      keyword: "Henting",
      maxDaysAhead: 10,
      now: NOW,
      fetcher: () => Promise.reject(new Error("fetch failed")),
    })

    expect(slots).toEqual([])
  })

  test("returns no slots when the calendar responds with an error", async () => {
    const slots = await fetchPickupSlotsFromIcsCalendar({
      url: "https://calendar.example.test/pickup.ics",
      keyword: "Henting",
      maxDaysAhead: 10,
      now: NOW,
      fetcher: () =>
        Promise.resolve(new Response("Not found", { status: 404 })),
    })

    expect(slots).toEqual([])
  })
})

describe("getPickupSlotLabel", () => {
  test("formats a saved pickup snapshot in Oslo time", () => {
    expect(
      getPickupSlotLabel({
        startsAt: "2026-06-06T09:00:00.000Z",
        endsAt: "2026-06-06T11:00:00.000Z",
      })
    ).toBe("lørdag 6. juni, 11:00–13:00")
  })
})
