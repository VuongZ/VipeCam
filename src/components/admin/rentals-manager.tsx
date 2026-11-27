"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Confirm } from "@/components/ui/confirm";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { money, dateLabel, statusLabels } from "@/lib/utils";
import type { RentalRow } from "@/components/rental/history";
import { transitions } from "@/services/booking-rules";
import { updateRentalStatus } from "@/actions/admin";
export function RentalsManager({ rentals }: { rentals: RentalRow[] }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [pending, run] = useTransition();
  const router = useRouter();
  const row = rentals.find((r) => r.id === selected);
  const rows = rentals.filter(
    (r) =>
      (!status || r.status === status) &&
      `${r.rentalCode} ${r.customerName} ${r.email} ${r.phone || ""} ${r.items.map((i) => i.cameraName).join(" ")}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  return (
    <>
      <div className="admin-heading">
        <h1>Đơn thuê</h1>
        <span className="text-muted text-sm">{rentals.length} đơn</span>
      </div>
      <div className="admin-toolbar">
        <input
          aria-label="Tìm đơn thuê"
          placeholder="Mã đơn, khách hàng, thiết bị..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select
          aria-label="Lọc trạng thái đơn"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">Tất cả trạng thái</option>
          {Object.keys(transitions).map((s) => (
            <option key={s} value={s}>
              {statusLabels[s]}
            </option>
          ))}
        </select>
      </div>
      {rows.length ? (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Mã đơn / khách hàng</th>
                <th>Thiết bị</th>
                <th>Ngày nhận → trả</th>
                <th>Tổng tiền</th>
                <th>Trạng thái</th>
                <th>Chi tiết</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>
                    <strong>{r.rentalCode}</strong>
                    <small>{r.customerName}</small>
                  </td>
                  <td>
                    {r.items.map((i) => (
                      <p key={i.id}>
                        {i.cameraName} × {i.quantity}
                      </p>
                    ))}
                  </td>
                  <td>
                    {dateLabel(r.startDate)}
                    <small>{dateLabel(r.endDate)}</small>
                  </td>
                  <td>{money(r.totalAmount)}</td>
                  <td>
                    <span className={`badge badge-${r.status}`}>
                      {statusLabels[r.status]}
                    </span>
                  </td>
                  <td>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Chi tiết ${r.rentalCode}`}
                      onClick={() => setSelected(r.id)}
                    >
                      <Eye size={19} />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty-state">Chưa có đơn thuê phù hợp.</div>
      )}
      <Sheet
        open={Boolean(row)}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      >
        <SheetContent>
          {row && (
            <>
              <SheetTitle className="text-xl font-semibold">
                {row.rentalCode}
              </SheetTitle>
              <SheetDescription className="mt-2">
                {row.customerName} · {row.email}
              </SheetDescription>
              <div className="mt-5">
                <span className={`badge badge-${row.status}`}>
                  {statusLabels[row.status]}
                </span>
              </div>
              <dl className="spec-list">
                <div>
                  <dt>Số điện thoại Zalo</dt>
                  <dd>{row.phone || "Chưa cập nhật"}</dd>
                </div>
                <div>
                  <dt>Ngày nhận</dt>
                  <dd>{dateLabel(row.startDate)}</dd>
                </div>
                <div>
                  <dt>Ngày trả</dt>
                  <dd>{dateLabel(row.endDate)}</dd>
                </div>
                {row.items.map((i) => (
                  <div key={i.id}>
                    <dt>
                      {i.cameraName} × {i.quantity}
                      <br />
                      {i.priceName}
                    </dt>
                    <dd>{money(i.totalPrice)}</dd>
                  </div>
                ))}
                <div>
                  <dt>Tiền thuê</dt>
                  <dd>{money(row.subtotal)}</dd>
                </div>
                <div>
                  <dt>Cọc hoàn lại</dt>
                  <dd>{money(row.deposit)}</dd>
                </div>
                <div>
                  <dt>Tổng tiền</dt>
                  <dd className="text-primary">{money(row.totalAmount)}</dd>
                </div>
              </dl>
              <p className="text-sm text-muted">
                Ghi chú: {row.note || "Không có"}
              </p>
              <div className="flex flex-wrap gap-3 mt-6">
                {transitions[row.status].map((next) => (
                  <Confirm
                    key={next}
                    title={`Chuyển đơn sang “${statusLabels[next]}”?`}
                    description={
                      next === "CONFIRMED"
                        ? "Hệ thống sẽ kiểm tra lại số lượng máy trống trước khi xác nhận."
                        : "Kiểm tra việc bàn giao, nhận máy và hoàn cọc trước khi cập nhật trạng thái."
                    }
                    onConfirm={() =>
                      run(async () => {
                        try {
                          const result = await updateRentalStatus(row.id, next);
                          if (result.error) toast.error(result.error);
                          else {
                            toast.success("Đã cập nhật đơn thuê.");
                            router.refresh();
                          }
                        } catch {
                          toast.error("Không thể kết nối. Vui lòng thử lại.");
                        }
                      })
                    }
                  >
                    <Button
                      disabled={pending}
                      variant={next === "CANCELLED" ? "destructive" : "default"}
                    >
                      {statusLabels[next]}
                    </Button>
                  </Confirm>
                ))}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
