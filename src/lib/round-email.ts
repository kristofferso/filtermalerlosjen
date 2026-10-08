export const ROUND_OPENED_DEFAULT_SUBJECT = "Ny kafferunde er åpnet"

const ROUND_OPENED_INTRO =
  "Tiden er inne. Enten du allerede er tom for kaffe, eller sitter på et berg med bønner du vurderer å flippe på Finn for litt kjappe penger — en ny innkjøpsrunde er i gang."

export function formatRoundCloseDate(value: Date | string | null | undefined) {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  if (!Number.isFinite(date.getTime())) return null
  return new Intl.DateTimeFormat("nb-NO", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Europe/Oslo",
  }).format(date)
}

// Default editable body for the round-opened email. Markdown, with
// {{navn}} merged per recipient.
export function buildRoundOpenedDefaultBody({
  supplierName,
  closesAt,
}: {
  supplierName?: string | null
  closesAt?: Date | string | null
}) {
  const supplier = supplierName?.trim()
  const closeDate = formatRoundCloseDate(closesAt)
  const detailBody = [
    supplier ? `Vi handler fra ${supplier} denne runden.` : null,
    closeDate ? `Runden stenger ${closeDate}.` : null,
  ]
    .filter((sentence): sentence is string => sentence !== null)
    .join(" ")

  return ["Hei {{navn}},", ROUND_OPENED_INTRO, detailBody]
    .filter(Boolean)
    .join("\n\n")
}
