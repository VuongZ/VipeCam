"use client";
import { useState } from "react";
import Link from "next/link";
import type { getRentals } from "@/services/booking";
import { dateLabel, money, statusLabels } from "@/lib/utils";
export type RentalRow = Awaited<ReturnType<typeof getRentals>>[number];
export function RentalHistory({ rentals }: { rentals: RentalRow[] }) {
  const [status, setStatus] = useState("");
  const rows = rentals.filter((r) => !status || r.status === status);
  return (
    <>
      <div className="rental-tabs">
        {["", "PENDING", "CONFIRMED", "RENTING", "COMPLETED", "CANCELLED"].map(
          (s) => (
            <button
              key={s}
              aria-pressed={status === s}
              onClick={() => setStatus(s)}
            >
              {s ? statusLabels[s] : "Tất cả"}
            </button>
          ),
        )}
      </div>
      <div className="rental-list">
        {rows.length ? (
          rows.map((r) => (
            <article className="panel" key={r.id}>
              <div className="rental-card-head">
                <strong>{r.rentalCode}</strong>
                <span className={`badge badge-${r.status}`}>
                  {statusLabels[r.status]}
                </span>
              </div>
              <div className="rental-summary">
                <div>
                  <small>Thiết bị</small>
                  {r.items.map((i) => (
                    <p key={i.id}>
                      <strong>{i.cameraName}</strong> × {i.quantity}
                      <span className="text-muted"> · {i.priceName}</span>
                    </p>
                  ))}
                </div>
                <div>
                  <small>Ngày nhận → ngày trả</small>
                  {dateLabel(r.startDate)} → {dateLabel(r.endDate)}
                </div>
                <div>
                  <small>Tổng tiền gồm cọc</small>
                  <strong className="price">{money(r.totalAmount)}</strong>
                  <small>Tiền thuê: {money(r.subtotal)}</small>
                  <small>Cọc: {money(r.deposit)}</small>
                </div>
              </div>
              {r.note && (
                <p className="mt-4 text-sm text-muted">Ghi chú: {r.note}</p>
              )}
              {r.status === "PENDING" && (
                <p className="mt-4 text-sm text-muted">
                  Cửa hàng đang kiểm tra yêu cầu. Thiết bị được giữ sau khi đơn
                  được xác nhận.
                </p>
              )}
            </article>
          ))
        ) : (
          <div className="empty-state">
            <h2>Chưa có đơn thuê</h2>
            <p>Chọn thiết bị để bắt đầu kế hoạch của bạn.</p>
            <Link href="/cameras" className="button button-primary">
              Khám phá thiết bị
            </Link>
          </div>
        )}
      </div>
    </>
  );
}
