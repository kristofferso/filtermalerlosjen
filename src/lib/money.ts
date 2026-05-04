export function formatKr(valueKr: number) {
  return `${valueKr} kr`
}

export function parseKroner(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return 0
  if (!/^\d+$/.test(trimmed)) return 0
  return Number.parseInt(trimmed, 10)
}
