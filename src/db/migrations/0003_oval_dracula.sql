CREATE TYPE "public"."feedback_platform" AS ENUM('FACEBOOK', 'TIKTOK', 'OTHER');--> statement-breakpoint
ALTER TABLE "feedbacks" ALTER COLUMN "customer_name" SET DEFAULT '';--> statement-breakpoint
ALTER TABLE "feedbacks" ALTER COLUMN "rating" SET DEFAULT 5;--> statement-breakpoint
ALTER TABLE "feedbacks" ALTER COLUMN "content" SET DEFAULT '';--> statement-breakpoint
ALTER TABLE "camera_images" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "camera_images" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "feedbacks" ADD COLUMN "image_url" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "feedbacks" ADD COLUMN "platform" "feedback_platform" DEFAULT 'OTHER' NOT NULL;--> statement-breakpoint
ALTER TABLE "feedbacks" ADD COLUMN "social_url" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "feedbacks" ADD COLUMN "display_order" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE INDEX "feedback_display_idx" ON "feedbacks" USING btree ("is_visible","is_featured","display_order","created_at");