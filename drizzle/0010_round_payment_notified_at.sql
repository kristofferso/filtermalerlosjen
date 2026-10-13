ALTER TABLE "rounds" ADD COLUMN IF NOT EXISTS "payment_notified_at" timestamp with time zone;--> statement-breakpoint
-- Rounds closed before this change sent the payment email on close.
UPDATE "rounds" SET "payment_notified_at" = "closed_at" WHERE "status" IN ('closed', 'ready') AND "payment_notified_at" IS NULL;
