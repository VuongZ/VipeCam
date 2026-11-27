"use client";
import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X, ZoomIn } from "lucide-react";
type Policy = { id: string; title: string; imageUrl: string };
function PolicyPhoto({ policy }: { policy: Policy }) {
  const [failed, setFailed] = useState(false);
  return failed ? (
    <span role="status">Không tải được ảnh. Vui lòng tải lại trang.</span>
  ) : (
    <img
      src={policy.imageUrl}
      alt={policy.title}
      loading="lazy"
      decoding="async"
      className="rental-policy-image object-contain"
      onError={() => setFailed(true)}
    />
  );
}
export function RentalPolicyGallery({
  rows,
  imageLabel = "quy định",
}: {
  rows: Policy[];
  imageLabel?: string;
}) {
  const [selected, setSelected] = useState<Policy | null>(null);
  if (!rows.length)
    return <p className="empty-state">Chưa có ảnh {imageLabel}.</p>;
  return (
    <>
      <div className="rental-policy-list">
        {rows.map((policy) => (
          <button
            type="button"
            key={policy.id}
            className="rental-policy-card"
            onClick={() => setSelected(policy)}
            aria-label={`Xem lớn ${policy.title}`}
          >
            <PolicyPhoto key={policy.imageUrl} policy={policy} />
            <span className="rental-policy-zoom">
              <ZoomIn size={18} /> Xem lớn
            </span>
          </button>
        ))}
      </div>
      <Dialog.Root
        open={!!selected}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="overlay" />
          <Dialog.Content className="rental-policy-modal">
            <div className="rental-policy-modal-heading">
              <div>
                <Dialog.Title>{selected?.title}</Dialog.Title>
                <Dialog.Description>
                  Cuộn để xem toàn bộ ảnh.
                </Dialog.Description>
              </div>
              <Dialog.Close
                className="button button-ghost button-icon"
                aria-label={`Đóng ảnh ${imageLabel}`}
              >
                <X size={22} />
              </Dialog.Close>
            </div>
            {selected && (
              <>
                <PolicyPhoto key={selected.imageUrl} policy={selected} />
                <a
                  className="button button-outline"
                  href={selected.imageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Mở ảnh gốc
                </a>
              </>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
