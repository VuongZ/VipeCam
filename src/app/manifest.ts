import type { MetadataRoute } from "next";
import { getSettings } from "@/services/catalog";
export const dynamic = "force-dynamic";
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const shop = await getSettings();
  return {
    id: "/",
    name: shop.shopName,
    short_name: shop.shopName,
    description: "Thuê máy ảnh và quản lý đơn thuê",
    start_url: "/",
    display: "standalone",
    background_color: "#FAFAFA",
    theme_color: "#EC4899",
    lang: "vi",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
