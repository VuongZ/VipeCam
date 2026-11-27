import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { cache } from "react";
import { db } from "@/db";
import {
  banners,
  cameras,
  cameraImages,
  cameraRecipes,
  categories,
  feedbacks,
  rentalPrices,
  rentalPolicies,
  settings,
} from "@/db/schema";
export const getSettings = cache(async () => {
  const [shop] = await db
    .select()
    .from(settings)
    .where(eq(settings.id, "shop"));
  if (!shop) throw new Error("Chưa có cài đặt cửa hàng. Vui lòng chạy seed.");
  return shop;
});
export const getCategories = cache(() =>
  db
    .select()
    .from(categories)
    .where(and(eq(categories.isActive, true), eq(categories.icon, "Camera")))
    .orderBy(asc(categories.displayOrder)),
);
export const getCatalog = cache(async (slug?: string) => {
  const rows = await db
    .select({ camera: cameras, category: categories.name })
    .from(cameras)
    .innerJoin(categories, eq(cameras.categoryId, categories.id))
    .where(
      and(
        eq(cameras.isActive, true),
        eq(categories.isActive, true),
        eq(categories.icon, "Camera"),
        slug ? eq(cameras.slug, slug) : undefined,
      ),
    )
    .orderBy(desc(cameras.isFeatured), desc(cameras.createdAt));
  if (!rows.length) return [];
  const ids = rows.map((r) => r.camera.id);
  const [images, prices, recipes] = await Promise.all([
    db
      .select()
      .from(cameraImages)
      .where(inArray(cameraImages.cameraId, ids))
      .orderBy(asc(cameraImages.displayOrder), asc(cameraImages.id)),
    db
      .select()
      .from(rentalPrices)
      .where(
        and(
          inArray(rentalPrices.cameraId, ids),
          eq(rentalPrices.isActive, true),
        ),
      )
      .orderBy(asc(rentalPrices.displayOrder)),
    db
      .select()
      .from(cameraRecipes)
      .where(inArray(cameraRecipes.cameraId, ids))
      .orderBy(cameraRecipes.displayOrder, cameraRecipes.id),
  ]);
  const imagesByCamera = new Map<string, typeof images>();
  const pricesByCamera = new Map<string, typeof prices>();
  for (const image of images) {
    const group = imagesByCamera.get(image.cameraId) || [];
    group.push(image);
    imagesByCamera.set(image.cameraId, group);
  }
  for (const price of prices) {
    const group = pricesByCamera.get(price.cameraId) || [];
    group.push(price);
    pricesByCamera.set(price.cameraId, group);
  }
  return rows.map(({ camera, category }) => ({
    ...camera,
    category,
    images: imagesByCamera.get(camera.id) || [],
    prices: pricesByCamera.get(camera.id) || [],
    recipeImages: recipes.filter((r) => r.cameraId === camera.id),
  }));
});
export type CatalogCamera = Awaited<ReturnType<typeof getCatalog>>[number];
export const getBanners = () =>
  db
    .select()
    .from(banners)
    .where(eq(banners.isActive, true))
    .orderBy(asc(banners.displayOrder));
export const getFeedbacks = () =>
  db
    .select()
    .from(feedbacks)
    .where(eq(feedbacks.isVisible, true))
    .orderBy(
      desc(feedbacks.isFeatured),
      asc(feedbacks.displayOrder),
      desc(feedbacks.createdAt),
    )
    .limit(20);

export const getRentalPolicies = () =>
  db
    .select()
    .from(rentalPolicies)
    .where(eq(rentalPolicies.isActive, true))
    .orderBy(asc(rentalPolicies.displayOrder), asc(rentalPolicies.id));
