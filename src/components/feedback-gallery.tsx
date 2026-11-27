"use client";
import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Star, X, ZoomIn } from "lucide-react";
import type { feedbacks } from "@/db/schema";
import { SafeImage } from "@/components/ui/safe-image";

function FeedbackPhoto({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className: string;
}) {
  const [failed, setFailed] = useState("");
  if (failed === src)
    return (
      <span className="feedback-image-error">Chưa tải được ảnh feedback.</span>
    );
  return (
    <img
      src={src}
      alt={alt}
      className={className}
      loading="lazy"
      onError={() => setFailed(src)}
      ref={(image) => {
        if (image?.complete && !image.naturalWidth) setFailed(src);
      }}
    />
  );
}

export function FeedbackGallery({
  rows,
}: {
  rows: (typeof feedbacks.$inferSelect)[];
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const visible = rows.filter((row) => row.isVisible);
  const selected = visible.find((row) => row.id === selectedId);
  function socialLink(row: typeof feedbacks.$inferSelect) {
    return row.socialUrl ? (
      <a
        className="feedback-social"
        href={row.socialUrl}
        target="_blank"
        rel="noopener noreferrer"
      >
        {row.platform === "FACEBOOK"
          ? "Xem trên Facebook"
          : row.platform === "TIKTOK"
            ? "Xem trên TikTok"
            : "Xem bài đăng"}
      </a>
    ) : null;
  }
  if (!visible.length)
    return <div className="empty-state">Chưa có đánh giá nào.</div>;
  return (
    <>
      <div
        className="feedback-carousel"
        aria-label="Feedback khách hàng"
        tabIndex={0}
      >
        {visible.map((row) => (
          <article
            className={`feedback-card ${row.imageUrl ? "feedback-card-image" : ""}`}
            key={row.id}
            data-feedback-id={row.id}
          >
            {row.imageUrl ? (
              <>
                <button
                  type="button"
                  className="feedback-image-button"
                  aria-label={`Xem lớn ảnh feedback${row.customerName ? ` của ${row.customerName}` : ""}`}
                  onClick={() => setSelectedId(row.id)}
                >
                  <FeedbackPhoto
                    src={row.imageUrl}
                    alt={
                      row.customerName
                        ? `Feedback của ${row.customerName}`
                        : "Ảnh feedback khách hàng"
                    }
                    className="feedback-photo"
                  />
                  <span className="feedback-zoom">
                    <ZoomIn size={17} /> Xem lớn
                  </span>
                </button>
                {row.content && <blockquote>{row.content}</blockquote>}
                {row.customerName && (
                  <p className="text-sm font-semibold">{row.customerName}</p>
                )}
              </>
            ) : (
              <>
                <div className="stars" aria-label={`${row.rating} trên 5 sao`}>
                  {Array.from({ length: row.rating }, (_, index) => (
                    <Star key={index} size={15} fill="currentColor" />
                  ))}
                </div>
                <blockquote>“{row.content}”</blockquote>
                <div className="feedback-person">
                  {row.avatarUrl ? (
                    <SafeImage
                      src={row.avatarUrl}
                      alt=""
                      width={40}
                      height={40}
                    />
                  ) : (
                    <span>{row.customerName.slice(0, 1)}</span>
                  )}
                  <div>
                    <strong>{row.customerName}</strong>
                    <small>
                      {new Intl.DateTimeFormat("vi-VN").format(
                        new Date(row.createdAt),
                      )}
                    </small>
                  </div>
                </div>
              </>
            )}
            {socialLink(row)}
          </article>
        ))}
      </div>
      <Dialog.Root
        open={Boolean(selected)}
        onOpenChange={(open) => {
          if (!open) setSelectedId(null);
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="overlay" />
          <Dialog.Content className="feedback-lightbox">
            <div className="feedback-lightbox-heading">
              <div>
                <Dialog.Title>Feedback khách hàng</Dialog.Title>
                <Dialog.Description>
                  {selected?.customerName ||
                    "Ảnh feedback đầy đủ. Cuộn để xem ảnh dài."}
                </Dialog.Description>
              </div>
              <Dialog.Close
                className="button button-ghost button-icon"
                aria-label="Đóng ảnh feedback"
              >
                <X size={22} />
              </Dialog.Close>
            </div>
            {selected && (
              <>
                <FeedbackPhoto
                  src={selected.imageUrl}
                  alt={
                    selected.customerName
                      ? `Feedback của ${selected.customerName}`
                      : "Ảnh feedback khách hàng"
                  }
                  className="feedback-full-image"
                />
                {socialLink(selected)}
              </>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
