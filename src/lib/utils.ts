import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
export function money(value: number) {
  return new Intl.NumberFormat("vi-VN").format(value) + "đ";
}
export function dateLabel(value: string) {
  return new Intl.DateTimeFormat("vi-VN", { timeZone: "UTC" }).format(
    new Date(value),
  );
}
export const statusLabels: Record<string, string> = {
  AVAILABLE: "Có sẵn",
  RENTED: "Đang cho thuê",
  MAINTENANCE: "Bảo trì",
  INACTIVE: "Ngừng cho thuê",
  PENDING: "Chờ xác nhận",
  CONFIRMED: "Đã xác nhận",
  RENTING: "Đang thuê",
  COMPLETED: "Hoàn thành",
  CANCELLED: "Đã hủy",
};
