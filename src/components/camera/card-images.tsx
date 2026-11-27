"use client";
import { useState } from "react";
import Link from "next/link";
import { Camera, ChevronLeft, ChevronRight } from "lucide-react";
import { SafeImage } from "@/components/ui/safe-image";
import { useImageSwipe } from "@/components/ui/use-image-swipe";

type Image = { id: string; imageUrl: string; isPrimary?: boolean };
export function CardImages({
  images,
  name,
  href,
  featured,
}: {
  images: Image[];
  name: string;
  href: string;
  featured: boolean;
}) {
  const [index, setIndex] = useState(() =>
    Math.max(
      0,
      images.findIndex((image) => image.isPrimary),
    ),
  );
  const active = Math.min(index, Math.max(0, images.length - 1));
  function move(offset: number) {
    if (images.length > 1)
      setIndex(
        (current) =>
          (Math.min(current, images.length - 1) + offset + images.length) %
          images.length,
      );
  }
  const swipe = useImageSwipe(move);
  return (
    <div className="camera-card-images" {...swipe}>
      <Link href={href} className="camera-photo" aria-label={`Xem ${name}`}>
        {images[active] ? (
          <SafeImage
            src={images[active].imageUrl}
            alt={`${name} — ảnh ${active + 1}`}
            loading="lazy"
            width={640}
            height={480}
            draggable={false}
          />
        ) : (
          <Camera size={64} />
        )}
        {featured && <span className="feature-badge">Được yêu thích</span>}
      </Link>
      {images.length > 1 && (
        <div className="camera-card-image-controls">
          <button
            type="button"
            aria-label={`Ảnh trước của ${name}`}
            onClick={() => move(-1)}
          >
            <ChevronLeft size={20} />
          </button>
          <span role="status">
            {active + 1} / {images.length}
          </span>
          <button
            type="button"
            aria-label={`Ảnh tiếp theo của ${name}`}
            onClick={() => move(1)}
          >
            <ChevronRight size={20} />
          </button>
        </div>
      )}
    </div>
  );
}
