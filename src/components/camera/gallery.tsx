"use client";
import { SafeImage } from "@/components/ui/safe-image";
import { useState } from "react";
import { Camera } from "lucide-react";
export function Gallery({
  images,
  name,
}: {
  images: { id: string; imageUrl: string }[];
  name: string;
}) {
  const [selected, setSelected] = useState(0);
  const active = Math.min(selected, Math.max(0, images.length - 1));
  return (
    <div>
      {images.length ? (
        <SafeImage
          className="gallery-main"
          src={images[active].imageUrl}
          alt={`${name} — ảnh ${active + 1}`}
          width={800}
          height={700}
        />
      ) : (
        <div className="gallery-main grid place-items-center">
          <Camera size={80} />
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
