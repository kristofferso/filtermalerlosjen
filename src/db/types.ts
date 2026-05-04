import type { InferSelectModel } from "drizzle-orm"
import type { coffees, orderItems, orders, roundCoffees, rounds, suppliers } from "./schema"

export type Supplier = InferSelectModel<typeof suppliers>
export type Coffee = InferSelectModel<typeof coffees>
export type Round = InferSelectModel<typeof rounds>
export type RoundCoffee = InferSelectModel<typeof roundCoffees>
export type Order = InferSelectModel<typeof orders>
export type OrderItem = InferSelectModel<typeof orderItems>
