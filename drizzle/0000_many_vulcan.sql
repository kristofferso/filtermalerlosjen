CREATE TYPE "public"."round_status" AS ENUM('draft', 'open', 'closed');--> statement-breakpoint
CREATE TABLE "coffees" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"supplier_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"price_kr" integer NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"round_coffee_id" uuid NOT NULL,
	"quantity" integer NOT NULL,
	"price_kr_snapshot" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"round_id" uuid NOT NULL,
	"customer_name" text NOT NULL,
	"paid" boolean DEFAULT false NOT NULL,
	"collected" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "round_coffees" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"round_id" uuid NOT NULL,
	"coffee_id" uuid NOT NULL,
	"name_snapshot" text NOT NULL,
	"price_kr_snapshot" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rounds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"supplier_id" uuid NOT NULL,
	"status" "round_status" DEFAULT 'draft' NOT NULL,
	"shipping_kr" integer DEFAULT 0 NOT NULL,
	"opened_at" timestamp with time zone,
	"closed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "suppliers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "suppliers_name_unique" UNIQUE("name")
);
--> statement-breakpoint
ALTER TABLE "coffees" ADD CONSTRAINT "coffees_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_round_coffee_id_round_coffees_id_fk" FOREIGN KEY ("round_coffee_id") REFERENCES "public"."round_coffees"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_round_id_rounds_id_fk" FOREIGN KEY ("round_id") REFERENCES "public"."rounds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "round_coffees" ADD CONSTRAINT "round_coffees_round_id_rounds_id_fk" FOREIGN KEY ("round_id") REFERENCES "public"."rounds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "round_coffees" ADD CONSTRAINT "round_coffees_coffee_id_coffees_id_fk" FOREIGN KEY ("coffee_id") REFERENCES "public"."coffees"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rounds" ADD CONSTRAINT "rounds_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "coffees_supplier_idx" ON "coffees" USING btree ("supplier_id");--> statement-breakpoint
CREATE INDEX "order_items_order_idx" ON "order_items" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "orders_round_idx" ON "orders" USING btree ("round_id");--> statement-breakpoint
CREATE INDEX "round_coffees_round_idx" ON "round_coffees" USING btree ("round_id");--> statement-breakpoint
CREATE UNIQUE INDEX "round_coffees_round_coffee_idx" ON "round_coffees" USING btree ("round_id","coffee_id");--> statement-breakpoint
CREATE UNIQUE INDEX "rounds_one_open_round_idx" ON "rounds" USING btree ("status") WHERE "rounds"."status" = 'open';--> statement-breakpoint
CREATE INDEX "rounds_supplier_idx" ON "rounds" USING btree ("supplier_id");