export function todayInVietnam() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}
export function rentalDays(start: string, end: string) {
  return Math.round((Date.parse(end) - Date.parse(start)) / 86400000) + 1;
}
export function overlaps(a: string, b: string, c: string, d: string) {
  return a <= d && b >= c;
}
// Dates are inclusive: release inventory on the day after the return date.
export function peakReserved(
  reservations: { startDate: string; endDate: string; quantity: number }[],
  start: string,
  end: string,
) {
  const events = new Map<number, number>();
  for (const reservation of reservations) {
    if (!overlaps(start, end, reservation.startDate, reservation.endDate))
      continue;
    const from = Date.parse(
      reservation.startDate < start ? start : reservation.startDate,
    );
    const until =
      Date.parse(reservation.endDate > end ? end : reservation.endDate) +
      86400000;
    events.set(from, (events.get(from) || 0) + reservation.quantity);
    events.set(until, (events.get(until) || 0) - reservation.quantity);
  }
  let count = 0,
    peak = 0;
  for (const [, delta] of [...events].sort(([a], [b]) => a - b)) {
    count += delta;
    peak = Math.max(peak, count);
  }
  return peak;
}
export const transitions: Record<string, string[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["RENTING", "CANCELLED"],
  RENTING: ["COMPLETED"],
  COMPLETED: [],
  CANCELLED: [],
};
export const unavailableMessage =
  "Máy hiện không còn trống trong khoảng thời gian bạn chọn.";
