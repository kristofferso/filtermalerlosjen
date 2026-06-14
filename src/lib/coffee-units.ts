// Orders are stored as whole bags ("poser"). The collective treats one bag as a
// fixed weight so we can present a grams headline on the leaderboard. Change this
// single constant if the standard bag size ever differs.
export const GRAMS_PER_BAG = 250

export function bagsToGrams(bags: number) {
  return Math.max(0, bags) * GRAMS_PER_BAG
}

export function gramsToBags(grams: number) {
  return grams / GRAMS_PER_BAG
}

/**
 * Human-readable weight. Under 1000 g we keep grams ("750 g"); at or above we
 * switch to kilos with one decimal ("12,5 kg"), using nb-NO grouping/decimals.
 */
export function formatGrams(grams: number) {
  const safe = Math.max(0, Math.round(grams))
  if (safe < 1000) {
    return `${safe.toLocaleString("nb-NO")} g`
  }
  const kg = safe / 1000
  return `${kg.toLocaleString("nb-NO", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })} kg`
}
