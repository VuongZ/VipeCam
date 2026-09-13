CREATE INDEX "camera_image_order_idx" ON "camera_images" USING btree ("camera_id","display_order");--> statement-breakpoint
CREATE INDEX "rental_item_price_idx" ON "rental_items" USING btree ("rental_price_id");--> statement-breakpoint
CREATE INDEX "rental_price_camera_idx" ON "rental_prices" USING btree ("camera_id","is_active","display_order");--> statement-breakpoint
CREATE INDEX "rental_created_idx" ON "rentals" USING btree ("created_at");