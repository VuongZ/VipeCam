CREATE TABLE "rental_policies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"image_url" text NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "rental_policies_order_check" CHECK ("rental_policies"."display_order" >= 0)
);
--> statement-breakpoint
CREATE INDEX "rental_policies_display_idx" ON "rental_policies" USING btree ("is_active","display_order");--> statement-breakpoint
INSERT INTO "rental_policies" ("title", "image_url", "display_order", "is_active") VALUES
('Quy định thuê máy — Ảnh 1', '/images/rental-policies/policy-1.jpg', 0, true),
('Quy định thuê máy — Ảnh 2', '/images/rental-policies/policy-2.jpg', 1, true),
('Quy định thuê máy — Ảnh 3', '/images/rental-policies/policy-3.jpg', 2, true),
('Quy định thuê máy — Ảnh 4', '/images/rental-policies/policy-4.jpg', 3, true);
