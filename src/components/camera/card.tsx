import { SafeImage } from "@/components/ui/safe-image";
import Link from "next/link";
import { ArrowUpRight, Camera } from "lucide-react";
import { money, statusLabels } from "@/lib/utils";
import type { CatalogCamera } from "@/services/catalog";
export function CameraCard({ camera }: { camera: CatalogCamera }) {
  const lowest = camera.prices.length
    ? Math.min(...camera.prices.map((p) => p.price))
    : null;
  return (
    <article className="camera-card">
      <Link
        href={`/cameras/${camera.slug}`}
        className="camera-photo"
        aria-label={`Xem ${camera.name}`}
      >
        {camera.images[0] ? (
          <SafeImage
            src={camera.images[0].imageUrl}
            alt={camera.name}
            loading="lazy"
            width={640}
            height={480}
          />
        ) : (
          <Camera size={64} />
        )}
        {camera.isFeatured && (
          <span className="feature-badge">Được yêu thích</span>
        )}
      </Link>
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
