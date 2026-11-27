import {
  and,
  eq,
  inArray,
  lte,
  gte,
  ne,
  sql,
  desc,
  or,
  getTableColumns,
} from "drizzle-orm";
import { db } from "@/db";
import {
  cameras,
  categories,
  rentalItems,
  rentalPrices,
  rentals,
  user,
} from "@/db/schema";
import { bookingSchema } from "@/validators";
import {
  rentalDays,
  todayInVietnam,
  transitions,
  unavailableMessage,
  peakReserved,
} from "./booking-rules";
type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
export async function reservedQuantity(
  tx: Transaction,
  cameraId: string,
  start: string,
  end: string,
  exclude?: string,
) {
  const reserved = await tx
    .select({
      startDate: rentals.startDate,
      endDate: rentals.endDate,
      status: rentals.status,
      quantity: rentalItems.quantity,
    })
    .from(rentalItems)
    .innerJoin(rentals, eq(rentals.id, rentalItems.rentalId))
    .where(
      and(
        eq(rentalItems.cameraId, cameraId),
        inArray(rentals.status, ["CONFIRMED", "RENTING"]),
        lte(rentals.startDate, end),
        or(gte(rentals.endDate, start), eq(rentals.status, "RENTING")),
        exclude ? ne(rentals.id, exclude) : undefined,
      ),
    );
  const today = todayInVietnam();
  return peakReserved(
    reserved.map((row) => ({
      ...row,
      // Overdue equipment is still out until the shop records its return.
      endDate:
        row.status === "RENTING" && row.endDate < today
          ? "9999-12-31"
          : row.endDate,
    })),
    start,
    end,
  );
}
async function remaining(
  tx: Transaction,
  cameraId: string,
  start: string,
  end: string,
  quantity: number,
  exclude?: string,
) {
  return Math.max(
    0,
    quantity - (await reservedQuantity(tx, cameraId, start, end, exclude)),
  );
}
export async function getAvailability(
  cameraId: string,
  start: string,
  end: string,
) {
  return db.transaction(async (tx) => {
    const [camera] = await tx
      .select({
        ...getTableColumns(cameras),
        categoryActive: categories.isActive,
      })
      .from(cameras)
      .innerJoin(categories, eq(categories.id, cameras.categoryId))
      .where(eq(cameras.id, cameraId));
    if (
      !camera ||
      !camera.categoryActive ||
      !camera.isActive ||
      ["MAINTENANCE", "INACTIVE"].includes(camera.status)
    )
      return 0;
    return remaining(tx, cameraId, start, end, camera.quantity);
  });
}
export async function createBooking(userId: string, raw: unknown) {
  const input = bookingSchema.parse(raw);
  if (input.startDate < todayInVietnam())
    throw new Error("Ngày nhận không được ở quá khứ.");
  return db.transaction(async (tx) => {
    // Serialize this customer's pending-order limit across different cameras.
    await tx
      .select({ id: user.id })
      .from(user)
      .where(eq(user.id, userId))
      .for("update");
    const [camera] = await tx
      .select()
      .from(cameras)
      .where(eq(cameras.id, input.cameraId))
      .for("update");
    if (
      !camera ||
      !camera.isActive ||
      ["MAINTENANCE", "INACTIVE"].includes(camera.status)
    )
      throw new Error(unavailableMessage);
    const [category] = await tx
      .select()
      .from(categories)
      .where(
        and(
          eq(categories.id, camera.categoryId),
          eq(categories.isActive, true),
        ),
      );
    if (!category) throw new Error(unavailableMessage);
    const [price] = await tx
      .select()
      .from(rentalPrices)
      .where(
        and(
          eq(rentalPrices.id, input.rentalPriceId),
          eq(rentalPrices.cameraId, camera.id),
          eq(rentalPrices.isActive, true),
        ),
      )
      .for("share");
    if (
      !price ||
      rentalDays(input.startDate, input.endDate) !== price.durationDays
    )
      throw new Error("Khoảng ngày cần khớp với gói thuê đã chọn.");
    if (
      (await remaining(
        tx,
        camera.id,
        input.startDate,
        input.endDate,
        camera.quantity,
      )) < input.quantity
    )
      throw new Error(unavailableMessage);
    const [pending] = await tx
      .select({ count: sql<number>`count(*)::int` })
      .from(rentals)
      .where(and(eq(rentals.userId, userId), eq(rentals.status, "PENDING")));
    if (pending.count >= 10)
      throw new Error(
        "Bạn đã có 10 đơn chờ xác nhận. Vui lòng liên hệ cửa hàng.",
      );
    const subtotal = price.price * input.quantity,
      deposit = camera.deposit * input.quantity;
    if (subtotal + deposit > 2000000000)
      throw new Error("Đơn vượt hạn mức. Vui lòng liên hệ cửa hàng.");
    const [rental] = await tx
      .insert(rentals)
      .values({
        userId,
        rentalCode: `VC-${crypto.randomUUID().slice(0, 12).toUpperCase()}`,
        startDate: input.startDate,
        endDate: input.endDate,
        subtotal,
        deposit,
        totalAmount: subtotal + deposit,
        note: input.note,
      })
      .returning();
    await tx.insert(rentalItems).values({
      rentalId: rental.id,
      cameraId: camera.id,
      rentalPriceId: price.id,
      cameraName: camera.name,
      priceName: price.name,
      quantity: input.quantity,
      unitPrice: price.price,
      totalPrice: subtotal,
    });
    return rental;
  });
}
export async function changeRentalStatus(
  id: string,
  next: typeof rentals.$inferSelect.status,
) {
  return db.transaction(async (tx) => {
    const [rental] = await tx
      .select()
      .from(rentals)
      .where(eq(rentals.id, id))
      .for("update");
    if (!rental || !transitions[rental.status].includes(next))
      throw new Error("Không thể chuyển trạng thái đơn thuê này.");
    if (next === "CONFIRMED" || next === "RENTING") {
      if (rental.endDate < todayInVietnam())
        throw new Error("Đơn đã quá ngày trả. Vui lòng hủy và tạo đơn mới.");
      if (next === "RENTING" && rental.startDate > todayInVietnam())
        throw new Error("Chưa đến ngày nhận máy.");
      const items = await tx
        .select()
        .from(rentalItems)
        .where(eq(rentalItems.rentalId, id))
        .orderBy(rentalItems.cameraId);
      for (const item of items) {
        const [camera] = await tx
          .select()
          .from(cameras)
          .where(eq(cameras.id, item.cameraId))
          .for("update");
        if (
          !camera ||
          !camera.isActive ||
          ["MAINTENANCE", "INACTIVE"].includes(camera.status) ||
          (await remaining(
            tx,
            camera.id,
            rental.startDate,
            rental.endDate,
            camera.quantity,
            id,
          )) < item.quantity
        )
          throw new Error(unavailableMessage);
      }
    }
    await tx.update(rentals).set({ status: next }).where(eq(rentals.id, id));
  });
}
export async function getRentals(userId?: string, limit?: number) {
  const query = db
    .select({
      rental: rentals,
      customerName: user.name,
      email: user.email,
      phone: user.phone,
    })
    .from(rentals)
    .innerJoin(user, eq(user.id, rentals.userId))
    .where(userId ? eq(rentals.userId, userId) : undefined)
    .orderBy(desc(rentals.createdAt));
  const rows = await (limit === undefined ? query : query.limit(limit));
  if (!rows.length) return [];
  const items = await db
    .select()
    .from(rentalItems)
    .where(
      inArray(
        rentalItems.rentalId,
        rows.map((r) => r.rental.id),
      ),
    );
  const byRental = new Map<string, typeof items>();
  for (const item of items) {
    const group = byRental.get(item.rentalId) || [];
    group.push(item);
    byRental.set(item.rentalId, group);
  }
  return rows.map((row) => ({
    ...row.rental,
    customerName: row.customerName,
    email: row.email,
    phone: row.phone,
    items: byRental.get(row.rental.id) || [],
  }));
}
