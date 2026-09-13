"use client";
import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CalendarDays, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CatalogCamera } from "@/services/catalog";
import { money } from "@/lib/utils";
import {
  todayInVietnam,
  rentalDays,
  unavailableMessage,
} from "@/services/booking-rules";
import { bookingSchema } from "@/validators";
import { bookCamera } from "@/actions/booking";
function endFor(start: string, days: number) {
  const value = Date.parse(start) + (days - 1) * 86400000;
  if (!Number.isFinite(value)) return "";
  const iso = new Date(value).toISOString();
  return iso.length === 24 ? iso.slice(0, 10) : "";
}
export function BookingForm({
  camera,
  depositText,
}: {
  camera: CatalogCamera;
  depositText: string;
}) {
  const router = useRouter();
  const [priceId, setPriceId] = useState(camera.prices[0]?.id || "");
  const price = camera.prices.find((p) => p.id === priceId);
  const [start, setStart] = useState(todayInVietnam());
  const [end, setEnd] = useState(
    endFor(todayInVietnam(), price?.durationDays || 1),
  );
  const [quantity, setQuantity] = useState(1);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const dateKey = `${camera.id}:${start}:${end}:${attempt}`;
  const validDates = Boolean(
    start && end && start <= end && start >= todayInVietnam(),
  );
  const [availabilityResult, setAvailabilityResult] = useState<{
    key: string;
    count: number | null;
  } | null>(null);
  const availability =
    validDates && availabilityResult?.key === dateKey
      ? availabilityResult.count
      : null;
  const checking = validDates && availabilityResult?.key !== dateKey;
  const [pending, run] = useTransition();
  useEffect(() => {
    if (!validDates) return;
    const controller = new AbortController();
    let active = true;
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/availability?cameraId=${camera.id}&start=${start}&end=${end}`,
          { signal: controller.signal },
        );
        const result = await response.json();
        if (active) {
          if (!response.ok) {
            setError(result.error);
            setAvailabilityResult({ key: dateKey, count: null });
          } else {
            setAvailabilityResult({ key: dateKey, count: result.available });
            setError("");
          }
        }
      } catch {
        if (active) {
          setError("Chưa kiểm tra được lịch thuê. Vui lòng thử lại.");
          setAvailabilityResult({ key: dateKey, count: null });
        }
      }
    }, 200);
    return () => {
      active = false;
      clearTimeout(timer);
      controller.abort();
    };
  }, [camera.id, start, end, dateKey, validDates]);
  const total = ((price?.price || 0) + camera.deposit) * quantity;
  const blocked =
    !price ||
    !validDates ||
    availability === null ||
    !Number.isInteger(quantity) ||
    quantity < 1 ||
    quantity > 20 ||
    (price && rentalDays(start, end) !== price.durationDays) ||
    ["MAINTENANCE", "INACTIVE"].includes(camera.status) ||
    camera.quantity < 1 ||
    (availability !== null && availability < quantity);
  function submit() {
    const parsed = bookingSchema.safeParse({
      cameraId: camera.id,
      rentalPriceId: priceId,
      startDate: start,
      endDate: end,
      quantity,
      note,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }
    if (price && rentalDays(start, end) !== price.durationDays) {
      setError("Ngày nhận và trả cần khớp số ngày của gói thuê.");
      return;
    }
    run(async () => {
      try {
        const result = await bookCamera(parsed.data);
        if (result.error) {
          setError(result.error);
          toast.error(result.error);
        } else {
          toast.success(
            `Đã gửi đơn ${result.code}. Cửa hàng sẽ xác nhận lịch thuê.`,
          );
          router.push("/rentals");
          router.refresh();
        }
      } catch {
        setError(
          "Không thể kết nối. Vui lòng kiểm tra đơn thuê trước khi gửi lại.",
        );
        toast.error("Không thể gửi đơn. Vui lòng kiểm tra kết nối.");
      }
    });
  }
  return (
    <>
      <div className="booking-panel" id="booking">
        <h2 className="text-xl flex items-center gap-2">
          <CalendarDays size={21} /> Chọn lịch thuê
        </h2>
        {camera.prices.length ? (
          <>
            <div className="price-options">
              {camera.prices.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  aria-pressed={p.id === priceId}
                  onClick={() => {
                    setPriceId(p.id);
                    if (start) setEnd(endFor(start, p.durationDays));
                  }}
                >
                  {p.name}
                  <strong>{money(p.price)}</strong>
                </button>
              ))}
            </div>
            <div className="form-grid">
              <label>
                Ngày nhận
                <input
                  type="date"
                  value={start}
                  min={todayInVietnam()}
                  onChange={(e) => {
                    setStart(e.target.value);
                    if (e.target.value && price)
                      setEnd(endFor(e.target.value, price.durationDays));
                  }}
                />
              </label>
              <label>
                Ngày trả
                <input
                  type="date"
                  min={start}
                  value={end}
                  onChange={(e) => setEnd(e.target.value)}
                />
              </label>
            </div>
            <p className="helper-text mt-2">
              Tính cả ngày nhận và ngày trả. Gói đang chọn:{" "}
              {price?.durationDays} ngày.
            </p>
            <label className="mt-4">
              Số lượng
              <input
                type="number"
                min={1}
                max={Math.min(camera.quantity, 20)}
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
              />
            </label>
            <p
              aria-live="polite"
              className={`mt-3 text-sm ${availability !== null && availability < quantity ? "error-text" : "text-muted"}`}
            >
              {checking
                ? "Đang kiểm tra lịch trống…"
                : availability !== null
                  ? availability < quantity
                    ? unavailableMessage
                    : `Còn ${availability} thiết bị trong khoảng ngày đã chọn.`
                  : "Chọn ngày để kiểm tra lịch thuê."}
            </p>
            <label className="mt-4">
              Ghi chú{" "}
              <textarea
                rows={2}
                maxLength={2000}
                placeholder="Thời gian nhận máy, yêu cầu thêm..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </label>
            <div className="booking-totals">
              <div>
                <span>Tiền thuê × {quantity}</span>
                <span>{money((price?.price || 0) * quantity)}</span>
              </div>
              <div>
                <span>Tiền cọc hoàn lại</span>
                <span>{money(camera.deposit * quantity)}</span>
              </div>
              <div>
                <span>Tổng cộng</span>
                <strong>{money(total)}</strong>
              </div>
            </div>
            {error && (
              <p className="error-text mb-3" role="alert">
                {error}
              </p>
            )}
            {validDates && !checking && availability === null && (
              <Button
                variant="outline"
                className="mb-3 w-full"
                onClick={() => setAttempt((value) => value + 1)}
              >
                Kiểm tra lại lịch trống
              </Button>
            )}
            {price &&
              validDates &&
              rentalDays(start, end) !== price.durationDays && (
                <p className="error-text mb-3" role="alert">
                  Ngày nhận và trả cần khớp số ngày của gói thuê.
                </p>
              )}
            <Button
              className="w-full"
              onClick={submit}
              disabled={pending || blocked || checking}
            >
              {pending ? "Đang gửi đơn…" : "Đặt thuê"}
              <ArrowRight size={18} />
            </Button>
            <p className="booking-note">
              Chưa cần thanh toán trực tuyến. Đơn chỉ giữ máy sau khi cửa hàng
              xác nhận.
            </p>
            <p className="booking-note">{depositText}</p>
          </>
        ) : (
          <p className="mt-4 text-muted">
            Cửa hàng đang cập nhật mức giá thuê cho thiết bị này.
          </p>
        )}
      </div>
      <div className="mobile-booking">
        <div>
          <small>Tổng tiền gồm cọc</small>
          <strong>{money(total)}</strong>
        </div>
        <Button disabled={pending || blocked || checking} onClick={submit}>
          {pending ? "Đang gửi…" : "Đặt thuê"}
          <ArrowRight size={17} />
        </Button>
      </div>
    </>
  );
}
