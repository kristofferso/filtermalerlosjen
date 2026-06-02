export type PickupSlot = {
  id: string
  startsAt: string
  endsAt: string
  dateLabel: string
  timeLabel: string
  label: string
}

type ParsePickupSlotsOptions = {
  now?: Date
  keyword: string
  maxDaysAhead: number
}

type FetchPickupSlotsOptions = ParsePickupSlotsOptions & {
  url: string
  fetcher?: typeof fetch
  debug?: boolean
}

type IcsEvent = {
  uid?: string
  summary?: string
  dtstart?: IcsDateValue
  dtend?: IcsDateValue
}

type IcsDateValue = {
  value: string
  timezone?: string
  isDateOnly: boolean
}

const OSLO_TIME_ZONE = "Europe/Oslo"

export function parsePickupSlotsFromIcs(
  ics: string,
  { now = new Date(), keyword, maxDaysAhead }: ParsePickupSlotsOptions
): Array<PickupSlot> {
  const normalizedKeyword = keyword.trim().toLocaleLowerCase("nb-NO")
  if (!normalizedKeyword || maxDaysAhead < 0) return []

  const latestStart = new Date(now.getTime())
  latestStart.setDate(latestStart.getDate() + maxDaysAhead)

  return parseIcsEvents(ics)
    .filter((event) =>
      (event.summary ?? "")
        .toLocaleLowerCase("nb-NO")
        .includes(normalizedKeyword)
    )
    .map((event) => {
      const startsAt = event.dtstart ? parseIcsDate(event.dtstart) : null
      const endsAt = event.dtend ? parseIcsDate(event.dtend) : null
      if (!startsAt || !endsAt) return null
      if (startsAt < now || startsAt > latestStart || endsAt <= startsAt)
        return null

      return buildPickupSlot({
        uid: event.uid,
        summary: event.summary ?? "",
        startsAt,
        endsAt,
      })
    })
    .filter((slot): slot is PickupSlot => Boolean(slot))
    .sort((left, right) => left.startsAt.localeCompare(right.startsAt))
}

export async function fetchPickupSlotsFromIcsCalendar({
  url,
  keyword,
  maxDaysAhead,
  now = new Date(),
  fetcher = fetch,
  debug = false,
}: FetchPickupSlotsOptions): Promise<Array<PickupSlot>> {
  try {
    const fetchUrl = normalizeCalendarUrl(url)
    logPickupDebug(debug, "fetch:start", {
      urlHost: safeUrlHost(fetchUrl),
      keyword,
      maxDaysAhead,
      now: now.toISOString(),
    })

    const response = await fetcher(fetchUrl, {
      cache: "no-store",
      headers: { "Cache-Control": "no-store" },
    })
    logPickupDebug(debug, "fetch:response", {
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
      contentType: response.headers.get("content-type"),
    })
    if (!response.ok) return []

    const ics = await response.text()
    const slots = parsePickupSlotsFromIcs(ics, {
      keyword,
      maxDaysAhead,
      now,
    })

    logPickupDebug(debug, "parse:summary", {
      icsLength: ics.length,
      ...summarizePickupSlotParsing(ics, { keyword, maxDaysAhead, now }),
      slotCount: slots.length,
      slots: slots.map((slot) => ({
        id: slot.id,
        label: slot.label,
        startsAt: slot.startsAt,
        endsAt: slot.endsAt,
      })),
    })

    return slots
  } catch (error) {
    logPickupDebug(debug, "fetch:error", {
      message: error instanceof Error ? error.message : String(error),
    })
    return []
  }
}

export function getPickupSlotLabel({
  startsAt,
  endsAt,
}: {
  startsAt: string | Date
  endsAt: string | Date
}) {
  const startDate = new Date(startsAt)
  const endDate = new Date(endsAt)
  return `${formatPickupDate(startDate)}, ${formatPickupTime(startDate)}–${formatPickupTime(endDate)}`
}

function buildPickupSlot({
  uid,
  summary,
  startsAt,
  endsAt,
}: {
  uid?: string
  summary: string
  startsAt: Date
  endsAt: Date
}): PickupSlot {
  const startsAtIso = startsAt.toISOString()
  const endsAtIso = endsAt.toISOString()
  const dateLabel = formatPickupDate(startsAt)
  const timeLabel = `${formatPickupTime(startsAt)}–${formatPickupTime(endsAt)}`

  return {
    id: `${uid?.trim() || summary}-${startsAtIso}-${endsAtIso}`,
    startsAt: startsAtIso,
    endsAt: endsAtIso,
    dateLabel,
    timeLabel,
    label: `${dateLabel}, ${timeLabel}`,
  }
}

function summarizePickupSlotParsing(
  ics: string,
  { now, keyword, maxDaysAhead }: Required<ParsePickupSlotsOptions>
) {
  const normalizedKeyword = keyword.trim().toLocaleLowerCase("nb-NO")
  const latestStart = new Date(now.getTime())
  latestStart.setDate(latestStart.getDate() + maxDaysAhead)

  const events = parseIcsEvents(ics)
  const summaries = events.map((event) => {
    const startsAt = event.dtstart ? parseIcsDate(event.dtstart) : null
    const endsAt = event.dtend ? parseIcsDate(event.dtend) : null
    const summary = event.summary ?? ""
    const reasons: Array<string> = []

    if (!summary.toLocaleLowerCase("nb-NO").includes(normalizedKeyword)) {
      reasons.push("keyword_mismatch")
    }
    if (!startsAt) reasons.push("missing_or_invalid_start")
    if (!endsAt) reasons.push("missing_or_invalid_end")
    if (startsAt && startsAt < now) reasons.push("starts_in_past")
    if (startsAt && startsAt > latestStart) reasons.push("beyond_max_days")
    if (startsAt && endsAt && endsAt <= startsAt)
      reasons.push("end_before_start")

    return {
      uid: event.uid ?? "",
      summary,
      rawStart: event.dtstart?.value ?? "",
      rawEnd: event.dtend?.value ?? "",
      startsAt: startsAt?.toISOString() ?? null,
      endsAt: endsAt?.toISOString() ?? null,
      accepted: reasons.length === 0,
      reasons,
    }
  })

  return {
    eventCount: events.length,
    matchingEventCount: summaries.filter((event) => event.accepted).length,
    filterWindow: {
      earliestStart: now.toISOString(),
      latestStart: latestStart.toISOString(),
    },
    events: summaries.slice(0, 20),
  }
}

function logPickupDebug(
  enabled: boolean,
  stage: string,
  details: Record<string, unknown>
) {
  if (!enabled) return
  console.info(`[pickup-slots] ${stage}`, details)
}

function normalizeCalendarUrl(url: string) {
  return url.replace(/^webcal:\/\//i, "https://")
}

function safeUrlHost(url: string) {
  try {
    const parsed = new URL(url)
    return parsed.host
  } catch {
    return "invalid-url"
  }
}

function parseIcsEvents(ics: string): Array<IcsEvent> {
  const events: Array<IcsEvent> = []
  let current: IcsEvent | null = null

  for (const line of unfoldIcsLines(ics)) {
    if (line === "BEGIN:VEVENT") {
      current = {}
      continue
    }
    if (line === "END:VEVENT") {
      if (current) events.push(current)
      current = null
      continue
    }
    if (!current) continue

    const separatorIndex = line.indexOf(":")
    if (separatorIndex === -1) continue

    const rawName = line.slice(0, separatorIndex)
    const value = unescapeIcsText(line.slice(separatorIndex + 1).trim())
    const [name, ...paramParts] = rawName.split(";")
    const normalizedName = name.toUpperCase()
    const params = new Map(
      paramParts.map((part) => {
        const [paramName, ...paramValueParts] = part.split("=")
        return [paramName.toUpperCase(), paramValueParts.join("=")]
      })
    )

    if (normalizedName === "UID") current.uid = value
    if (normalizedName === "SUMMARY") current.summary = value
    if (normalizedName === "DTSTART") {
      current.dtstart = {
        value,
        timezone: params.get("TZID"),
        isDateOnly: params.get("VALUE") === "DATE" || /^\d{8}$/.test(value),
      }
    }
    if (normalizedName === "DTEND") {
      current.dtend = {
        value,
        timezone: params.get("TZID"),
        isDateOnly: params.get("VALUE") === "DATE" || /^\d{8}$/.test(value),
      }
    }
  }

  return events
}

function unfoldIcsLines(ics: string) {
  const lines = ics.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n")
  const unfolded: Array<string> = []

  for (const line of lines) {
    if (/^[ \t]/.test(line) && unfolded.length > 0) {
      unfolded[unfolded.length - 1] += line.slice(1)
    } else if (line.trim()) {
      unfolded.push(line.trim())
    }
  }

  return unfolded
}

function parseIcsDate(dateValue: IcsDateValue) {
  const match = dateValue.value.match(
    /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?$/
  )
  if (!match) return null

  const [, year, month, day, hour = "00", minute = "00", second = "00", zulu] =
    match
  const parts = {
    year: Number(year),
    month: Number(month),
    day: Number(day),
    hour: Number(hour),
    minute: Number(minute),
    second: Number(second),
  }

  if (zulu) {
    return new Date(
      Date.UTC(
        parts.year,
        parts.month - 1,
        parts.day,
        parts.hour,
        parts.minute,
        parts.second
      )
    )
  }

  return zonedTimeToUtc(parts, dateValue.timezone || OSLO_TIME_ZONE)
}

function zonedTimeToUtc(
  parts: {
    year: number
    month: number
    day: number
    hour: number
    minute: number
    second: number
  },
  timeZone: string
) {
  let utcGuess = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second
  )

  for (let attempt = 0; attempt < 2; attempt++) {
    const offset = getTimeZoneOffsetMs(new Date(utcGuess), timeZone)
    utcGuess =
      Date.UTC(
        parts.year,
        parts.month - 1,
        parts.day,
        parts.hour,
        parts.minute,
        parts.second
      ) - offset
  }

  return new Date(utcGuess)
}

function getTimeZoneOffsetMs(date: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  })
  const parts = Object.fromEntries(
    formatter
      .formatToParts(date)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)])
  )

  const zonedAsUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second
  )
  return zonedAsUtc - date.getTime()
}

function formatPickupDate(date: Date) {
  return new Intl.DateTimeFormat("nb-NO", {
    timeZone: OSLO_TIME_ZONE,
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(date)
}

function formatPickupTime(date: Date) {
  return new Intl.DateTimeFormat("nb-NO", {
    timeZone: OSLO_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)
}

function unescapeIcsText(value: string) {
  return value
    .replace(/\\n/gi, "\n")
    .replace(/\\,/g, ",")
    .replace(/\\;/g, ";")
    .replace(/\\\\/g, "\\")
}
