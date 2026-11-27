"use client";
import { SafeImage } from "@/components/ui/safe-image";
import { useImageSwipe } from "@/components/ui/use-image-swipe";
import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, ChevronLeft, ChevronRight } from "lucide-react";
import type { banners } from "@/db/schema";
export function BannerCarousel({
  banners: rows,
}: {
  banners: (typeof banners.$inferSelect)[];
}) {
  const [index, setIndex] = useState(0);
  function move(offset: number) {
    if (rows.length > 1)
      setIndex(
        (current) =>
          (Math.min(current, rows.length - 1) + offset + rows.length) %
          rows.length,
      );
  }
  const swipe = useImageSwipe(move);
  if (!rows.length) return null;
  const active = Math.min(index, rows.length - 1);
  const banner = rows[active];
  return (
    <section
      {...swipe}
      className="hero"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
          event.preventDefault();
          move(event.key === "ArrowLeft" ? -1 : 1);
        }
      }}
      aria-roledescription="băng chuyền"
      aria-label="Nổi bật"
    >
      <SafeImage
        className="hero-image"
        src={banner.imageUrl}
        alt=""
        fetchPriority="high"
        draggable={false}
      />
      <div className="hero-shade" />
      <div className="hero-content">
        <span className="hero-kicker">
          <span /> THUÊ THIẾT BỊ · THỎA SỨC SÁNG TẠO
        </span>
        <h1>{banner.title}</h1>
        <p>{banner.subtitle}</p>
        <Link className="button button-primary" href={banner.linkUrl}>
          {banner.buttonText}
          <ArrowUpRight size={19} />
        </Link>
      </div>
      {rows.length > 1 && (
        <div className="hero-controls">
          <div className="hero-dots">
            {rows.map((row, i) => (
              <button
                key={row.id}
                aria-label={`Banner ${i + 1}`}
                aria-current={active === i}
                onClick={() => setIndex(i)}
              >
                <span />
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button aria-label="Banner trước" onClick={() => move(-1)}>
              <ChevronLeft size={19} />
            </button>
            <button aria-label="Banner tiếp theo" onClick={() => move(1)}>
              <ChevronRight size={19} />
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
