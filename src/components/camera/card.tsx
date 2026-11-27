import { CardImages } from "./card-images";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { money, statusLabels } from "@/lib/utils";
import type { CatalogCamera } from "@/services/catalog";
export function CameraCard({
  camera,
  imageCarousel = true,
}: {
  camera: CatalogCamera;
  imageCarousel?: boolean;
}) {
  const primary =
    camera.images.find((image) => image.isPrimary) || camera.images[0];
  const lowest = camera.prices.length
    ? Math.min(...camera.prices.map((p) => p.price))
    : null;
  return (
    <article className="camera-card">
      <CardImages
        images={imageCarousel ? camera.images : primary ? [primary] : []}
        name={camera.name}
        href={`/cameras/${camera.slug}`}
        featured={camera.isFeatured}
      />
      <div className="camera-info">
        <div className="eyebrow">
          {camera.brand} <span> / {camera.category}</span>
        </div>
        <Link href={`/cameras/${camera.slug}`}>
          <h3>{camera.name}</h3>
        </Link>
        <p className="camera-spec">{camera.shortDescription}</p>
        <div className="card-bottom">
          <div>
            <span className="price">
              {lowest !== null ? money(lowest) : "Liên hệ"}
            </span>
            <span className="price-suffix">
              {lowest !== null ? " / gói" : ""}
            </span>
            <div
              className={`availability ${camera.quantity === 0 || ["MAINTENANCE", "INACTIVE"].includes(camera.status) ? "unavailable" : ""}`}
            >
              {camera.quantity === 0
                ? "Tạm hết máy"
                : statusLabels[camera.status]}
            </div>
          </div>
          <Link
            href={`/cameras/${camera.slug}`}
            className="card-arrow"
            aria-label={`Xem chi tiết ${camera.name}`}
          >
            <ArrowUpRight size={21} />
          </Link>
        </div>
      </div>
    </article>
  );
}
