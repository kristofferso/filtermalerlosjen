ALTER TABLE "coffees" ADD COLUMN "image_url" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "coffees" ADD COLUMN "is_deleted" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "round_coffees" ADD COLUMN "image_url_snapshot" text DEFAULT '' NOT NULL;