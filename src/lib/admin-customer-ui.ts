export function getCustomerPhoneHref(phone: string) {
  return `tel:${phone.replace(/[\s().-]/g, "")}`
}

export function getCustomerEmailHref(email: string) {
  return `mailto:${email.trim()}`
}

export function getCustomerRowClasses(
  customerId: string,
  highlightedCustomerId?: string
) {
  const base =
    "grid gap-2 border-b border-border p-4 transition-colors last:border-b-0 sm:grid-cols-[1fr_9rem_1fr_auto] sm:items-center"

  if (customerId !== highlightedCustomerId) return base

  return `${base} bg-primary/5 ring-1 ring-inset ring-primary/20`
}
