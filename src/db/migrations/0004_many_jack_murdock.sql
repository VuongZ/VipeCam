ALTER TABLE "settings" ADD COLUMN "facebook_url" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "tiktok_url" text DEFAULT '' NOT NULL;--> statement-breakpoint
UPDATE "settings" SET "facebook_url" = btrim("facebook") WHERE "facebook" <> '';
