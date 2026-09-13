import { notFound } from "next/navigation";
import { db } from "@/db";
import {
  banners,
  cameras,
  cameraImages,
  categories,
  feedbacks,
  rentalPrices,
} from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { ResourceManager } from "@/components/admin/resource-manager";
import type { AdminRecord } from "@/components/admin/editor";
import { resources } from "@/lib/admin-resources";
export default async function ResourcePage({
  params,
  searchParams,
}: {
  params: Promise<{ resource: string }>;
  searchParams: Promise<{ camera?: string }>;
}) {
  await requireAdmin();
  const { resource } = await params;
  const { camera } = await searchParams;
  if (!Object.hasOwn(resources, resource)) notFound();
  const choices = {
    cameras: await db
      .select({ id: cameras.id, name: cameras.name })
      .from(cameras)
      .orderBy(cameras.name),
    categories: await db
      .select({ id: categories.id, name: categories.name })
      .from(categories)
      .orderBy(categories.displayOrder),
  };
  let rows: AdminRecord[];
  switch (resource) {
    case "cameras":
      rows = await db.select().from(cameras).orderBy(cameras.name);
      break;
    case "categories":
      rows = await db
        .select()
        .from(categories)
        .orderBy(categories.displayOrder);
      break;
    case "prices":
      rows = await db
        .select()
        .from(rentalPrices)
        .orderBy(rentalPrices.displayOrder);
      break;
    case "images":
      rows = await db
        .select()
        .from(cameraImages)
        .orderBy(cameraImages.displayOrder);
      break;
    case "banners":
      rows = await db.select().from(banners).orderBy(banners.displayOrder);
      break;
    case "feedbacks":
      rows = await db.select().from(feedbacks).orderBy(feedbacks.createdAt);
      break;
    default:
      notFound();
  }
  return (
    <ResourceManager
      key={`${resource}:${camera || ""}`}
      resource={resource}
      rows={rows}
      choices={choices}
      initialCamera={camera}
    />
  );
}
