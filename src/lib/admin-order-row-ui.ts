export type OrderStatusKind = "payment" | "pickup"

const orderStatusPillBase =
  "inline-flex items-center gap-1.5 rounded-md border px-2 py-1 font-mono text-xs"

const orderStatusPillClasses: Record<
  OrderStatusKind,
  Record<"checked" | "unchecked", string>
> = {
  payment: {
    checked:
      "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    unchecked: "border-border bg-muted/30 text-muted-foreground",
  },
  pickup: {
    checked: "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300",
    unchecked: "border-border bg-muted/30 text-muted-foreground",
  },
}

export function getOrderStatusPillClasses(
  kind: OrderStatusKind,
  checked: boolean
) {
  return `${orderStatusPillBase} ${orderStatusPillClasses[kind][checked ? "checked" : "unchecked"]}`
}
