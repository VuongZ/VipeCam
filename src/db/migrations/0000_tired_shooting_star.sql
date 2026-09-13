CREATE TYPE "public"."camera_status" AS ENUM('AVAILABLE', 'RENTED', 'MAINTENANCE', 'INACTIVE');--> statement-breakpoint
CREATE TYPE "public"."rental_status" AS ENUM('PENDING', 'CONFIRMED', 'RENTING', 'COMPLETED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('CUSTOMER', 'ADMIN');--> statement-breakpoint
CREATE TABLE "auth_accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "banners" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"subtitle" text NOT NULL,
	"image_url" text NOT NULL,
	"button_text" text NOT NULL,
	"link_url" text NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "camera_images" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"camera_id" uuid NOT NULL,
	"image_url" text NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cameras" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"brand" text NOT NULL,
	"model" text NOT NULL,
	"description" text NOT NULL,
	"short_description" text NOT NULL,
	"specifications" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"deposit" integer NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"status" "camera_status" DEFAULT 'AVAILABLE' NOT NULL,
	"category_id" uuid NOT NULL,
	"is_featured" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cameras_slug_unique" UNIQUE("slug"),
	CONSTRAINT "camera_amounts_positive" CHECK ("cameras"."deposit" >= 0 AND "cameras"."quantity" >= 0)
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"icon" text DEFAULT 'Camera' NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "feedbacks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_name" text NOT NULL,
	"avatar_url" text,
	"rating" integer NOT NULL,
	"content" text NOT NULL,
	"is_visible" boolean DEFAULT true NOT NULL,
	"is_featured" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "rating_range" CHECK ("feedbacks"."rating" BETWEEN 1 AND 5)
);
--> statement-breakpoint
CREATE TABLE "rate_limits" (
	"id" text PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"count" integer NOT NULL,
	"last_request" timestamp NOT NULL,
	CONSTRAINT "rate_limits_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "rental_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"rental_id" uuid NOT NULL,
	"camera_id" uuid NOT NULL,
	"rental_price_id" uuid,
	"camera_name" text NOT NULL,
	"price_name" text NOT NULL,
	"quantity" integer NOT NULL,
	"unit_price" integer NOT NULL,
	"total_price" integer NOT NULL,
	CONSTRAINT "item_positive" CHECK ("rental_items"."quantity" > 0 AND "rental_items"."unit_price" > 0 AND "rental_items"."total_price" = "rental_items"."unit_price" * "rental_items"."quantity")
);
--> statement-breakpoint
CREATE TABLE "rental_prices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"camera_id" uuid NOT NULL,
	"name" text NOT NULL,
	"duration_days" integer NOT NULL,
	"price" integer NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "price_positive" CHECK ("rental_prices"."price" > 0 AND "rental_prices"."duration_days" > 0)
);
--> statement-breakpoint
CREATE TABLE "rentals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"rental_code" text NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"subtotal" integer NOT NULL,
	"deposit" integer NOT NULL,
	"total_amount" integer NOT NULL,
	"status" "rental_status" DEFAULT 'PENDING' NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "rentals_rental_code_unique" UNIQUE("rental_code"),
	CONSTRAINT "rental_valid_dates" CHECK ("rentals"."end_date" >= "rentals"."start_date"),
	CONSTRAINT "rental_totals" CHECK ("rentals"."subtotal" >= 0 AND "rentals"."deposit" >= 0 AND "rentals"."total_amount" = "rentals"."subtotal" + "rentals"."deposit")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sessions_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"id" text PRIMARY KEY DEFAULT 'shop' NOT NULL,
	"shop_name" text NOT NULL,
	"logo_url" text DEFAULT '' NOT NULL,
	"phone" text DEFAULT '' NOT NULL,
	"zalo" text DEFAULT '' NOT NULL,
	"facebook" text DEFAULT '' NOT NULL,
	"email" text DEFAULT '' NOT NULL,
	"address" text DEFAULT '' NOT NULL,
	"default_deposit_text" text DEFAULT '' NOT NULL,
	"rental_policy" text DEFAULT '' NOT NULL,
	"terms" text DEFAULT '' NOT NULL,
	"about" text DEFAULT '' NOT NULL,
	"footer_text" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"role" "user_role" DEFAULT 'CUSTOMER' NOT NULL,
	"phone" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verifications" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "auth_accounts" ADD CONSTRAINT "auth_accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "camera_images" ADD CONSTRAINT "camera_images_camera_id_cameras_id_fk" FOREIGN KEY ("camera_id") REFERENCES "public"."cameras"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cameras" ADD CONSTRAINT "cameras_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rental_items" ADD CONSTRAINT "rental_items_rental_id_rentals_id_fk" FOREIGN KEY ("rental_id") REFERENCES "public"."rentals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rental_items" ADD CONSTRAINT "rental_items_camera_id_cameras_id_fk" FOREIGN KEY ("camera_id") REFERENCES "public"."cameras"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rental_items" ADD CONSTRAINT "rental_items_rental_price_id_rental_prices_id_fk" FOREIGN KEY ("rental_price_id") REFERENCES "public"."rental_prices"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rental_prices" ADD CONSTRAINT "rental_prices_camera_id_cameras_id_fk" FOREIGN KEY ("camera_id") REFERENCES "public"."cameras"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rentals" ADD CONSTRAINT "rentals_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_user_idx" ON "auth_accounts" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "one_primary_image" ON "camera_images" USING btree ("camera_id") WHERE "camera_images"."is_primary" = true;--> statement-breakpoint
CREATE INDEX "camera_category_idx" ON "cameras" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "rental_item_camera_idx" ON "rental_items" USING btree ("camera_id");--> statement-breakpoint
CREATE INDEX "rental_item_rental_idx" ON "rental_items" USING btree ("rental_id");--> statement-breakpoint
CREATE INDEX "rental_overlap_idx" ON "rentals" USING btree ("status","start_date","end_date");--> statement-breakpoint
CREATE INDEX "rental_user_idx" ON "rentals" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "session_user_idx" ON "sessions" USING btree ("user_id");