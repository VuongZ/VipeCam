import type { MetadataRoute } from "next";
import { getCatalog } from "@/services/catalog";
export const dynamic = "force-dynamic";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const cameras = await getCatalog();
  return [
    { url: base, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/cameras`, changeFrequency: "daily", priority: 0.9 },
    ...cameras.map((c) => ({
      url: `${base}/cameras/${c.slug}`,
      lastModified: c.updatedAt,
      priority: 0.8,
    })),
  ];
}
