import { relations, sql } from "drizzle-orm"
import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core"

export const roundStatus = pgEnum("round_status", [
  "draft",
  "open",
  "closed",
  "ready",
])

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
}

export const suppliers = pgTable("suppliers", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
})

export const coffees = pgTable(
  "coffees",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    supplierId: uuid("supplier_id")
      .notNull()
      .references(() => suppliers.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    imageUrl: text("image_url").notNull().default(""),
    priceKr: integer("price_kr").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    isDeleted: boolean("is_deleted").notNull().default(false),
    ...timestamps,
  },
  (table) => ({
    supplierIdx: index("coffees_supplier_idx").on(table.supplierId),
  })
)

export const rounds = pgTable(
  "rounds",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    supplierId: uuid("supplier_id")
      .notNull()
      .references(() => suppliers.id, { onDelete: "restrict" }),
    status: roundStatus("status").notNull().default("draft"),
    shippingKr: integer("shipping_kr").notNull().default(0),
    pickupInstructions: text("pickup_instructions").notNull().default(""),
    openedAt: timestamp("opened_at", { withTimezone: true }),
    closesAt: timestamp("closes_at", { withTimezone: true }),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => ({
    oneOpenRound: uniqueIndex("rounds_one_open_round_idx")
      .on(table.status)
      .where(sql`${table.status} = 'open'`),
    supplierIdx: index("rounds_supplier_idx").on(table.supplierId),
  })
)

export const roundCoffees = pgTable(
  "round_coffees",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    roundId: uuid("round_id")
      .notNull()
      .references(() => rounds.id, { onDelete: "cascade" }),
    coffeeId: uuid("coffee_id")
      .notNull()
      .references(() => coffees.id, { onDelete: "restrict" }),
    nameSnapshot: text("name_snapshot").notNull(),
    imageUrlSnapshot: text("image_url_snapshot").notNull().default(""),
    priceKrSnapshot: integer("price_kr_snapshot").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    roundIdx: index("round_coffees_round_idx").on(table.roundId),
    uniqueCoffeePerRound: uniqueIndex("round_coffees_round_coffee_idx").on(
      table.roundId,
      table.coffeeId
    ),
  })
)

export const customers = pgTable(
  "customers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    phone: text("phone").notNull(),
    email: text("email").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    ...timestamps,
  },
  (table) => ({
    nameIdx: index("customers_name_idx").on(table.name),
    emailIdx: index("customers_email_idx").on(table.email),
  })
)

export const orders = pgTable(
  "orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    roundId: uuid("round_id")
      .notNull()
      .references(() => rounds.id, { onDelete: "cascade" }),
    customerId: uuid("customer_id").references(() => customers.id, {
      onDelete: "restrict",
    }),
    customerName: text("customer_name").notNull(),
    customerPhone: text("customer_phone"),
    customerEmail: text("customer_email"),
    paid: boolean("paid").notNull().default(false),
    collected: boolean("collected").notNull().default(false),
    ...timestamps,
  },
  (table) => ({
    roundIdx: index("orders_round_idx").on(table.roundId),
  })
)

export const orderItems = pgTable(
  "order_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    roundCoffeeId: uuid("round_coffee_id")
      .notNull()
      .references(() => roundCoffees.id, { onDelete: "restrict" }),
    quantity: integer("quantity").notNull(),
    priceKrSnapshot: integer("price_kr_snapshot").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    orderIdx: index("order_items_order_idx").on(table.orderId),
  })
)

export const suppliersRelations = relations(suppliers, ({ many }) => ({
  coffees: many(coffees),
  rounds: many(rounds),
}))

export const coffeesRelations = relations(coffees, ({ one, many }) => ({
  supplier: one(suppliers, {
    fields: [coffees.supplierId],
    references: [suppliers.id],
  }),
  roundCoffees: many(roundCoffees),
}))

export const roundsRelations = relations(rounds, ({ one, many }) => ({
  supplier: one(suppliers, {
    fields: [rounds.supplierId],
    references: [suppliers.id],
  }),
  roundCoffees: many(roundCoffees),
  orders: many(orders),
}))

export const roundCoffeesRelations = relations(
  roundCoffees,
  ({ one, many }) => ({
    round: one(rounds, {
      fields: [roundCoffees.roundId],
      references: [rounds.id],
    }),
    coffee: one(coffees, {
      fields: [roundCoffees.coffeeId],
      references: [coffees.id],
    }),
    orderItems: many(orderItems),
  })
)

export const customersRelations = relations(customers, ({ many }) => ({
  orders: many(orders),
}))

export const ordersRelations = relations(orders, ({ one, many }) => ({
  round: one(rounds, { fields: [orders.roundId], references: [rounds.id] }),
  customer: one(customers, {
    fields: [orders.customerId],
    references: [customers.id],
  }),
  items: many(orderItems),
}))

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }),
  roundCoffee: one(roundCoffees, {
    fields: [orderItems.roundCoffeeId],
    references: [roundCoffees.id],
  }),
}))
