"use client";
import { SafeImage } from "@/components/ui/safe-image";
import { useState } from "react";
import { useImageSwipe } from "@/components/ui/use-image-swipe";
import { Camera, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
export function Gallery({
  images,
  name,
}: {
  images: { id: string; imageUrl: string; isPrimary?: boolean }[];
  name: string;
}) {
  const [selected, setSelected] = useState(() =>
    Math.max(
      0,
      images.findIndex((image) => image.isPrimary),
    ),
  );
  const active = Math.min(selected, Math.max(0, images.length - 1));
  function move(offset: number) {
    if (images.length)
      setSelected(
        (current) =>
          (Math.min(current, images.length - 1) + offset + images.length) %
          images.length,
      );
  }
  const swipe = useImageSwipe(move);
  return (
    <div
      className="product-gallery"
      role="region"
      aria-label={`Ảnh ${name}`}
      aria-roledescription="carousel"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
          event.preventDefault();
          move(event.key === "ArrowLeft" ? -1 : 1);
        }
      }}
    >
      <div className="gallery-stage" {...swipe}>
        {images.length ? (
          <SafeImage
            className="gallery-main"
            src={images[active].imageUrl}
            alt={`${name} — ảnh ${active + 1}`}
            width={800}
            height={700}
            draggable={false}
          />
        ) : (
          <div className="gallery-main grid place-items-center">
            <Camera size={80} />
          </div>
        )}
      </div>
      {images.length > 1 && (
        <div className="gallery-controls">
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Ảnh trước"
            onClick={() => move(-1)}
          >
            <ChevronLeft size={20} />
          </Button>
          <span role="status">
            Ảnh {active + 1} / {images.length}
          </span>
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Ảnh tiếp theo"
            onClick={() => move(1)}
          >
            <ChevronRight size={20} />
          </Button>
        </div>
      )}
      {images.length > 1 && (
        <div className="gallery-thumbs">
          {images.map((image, i) => (
            <button
              key={image.id}
              aria-label={`Xem ảnh ${i + 1}`}
              aria-pressed={i === active}
              onClick={() => setSelected(i)}
            >
              <SafeImage src={image.imageUrl} alt="" width={70} height={70} />
            </button>
          ))}
        </div>
      )}
      {images[active]?.imageUrl.includes("placeholder") && (
        <p className="helper-text mt-2">
          Ảnh minh họa. Cửa hàng sẽ cập nhật ảnh thiết bị thực tế.
        </p>
      )}
    </div>
  );
}
