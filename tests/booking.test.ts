import { test, after } from "node:test";
import assert from "node:assert/strict";
import { config } from "dotenv";
import { eq, inArray } from "drizzle-orm";
import {
  rentalDays,
  overlaps,
  transitions,
  peakReserved,
} from "../src/services/booking-rules";
import { bookingSchema, safeUrl } from "../src/validators";
import { imageType } from "../src/services/storage";
config({ path: [".env.local", ".env"], quiet: true });
const localUrl = process.env.TEST_DATABASE_URL;
if (
  !localUrl ||
  !["127.0.0.1", "localhost"].includes(new URL(localUrl).hostname)
)
  throw new Error(
    "Integration tests require a dedicated local PostgreSQL via TEST_DATABASE_URL.",
  );
process.env.DATABASE_URL = localUrl;
const { db, closeDatabase } = await import("../src/db");
const { cameras, categories, rentalPrices, rentals, rentalItems, user } =
  await import("../src/db/schema");
const { createBooking, changeRentalStatus, getAvailability } =
  await import("../src/services/booking");
const suffix = crypto.randomUUID();
const userId = `test-${suffix}`;
let cameraId: string,
  secondCameraId: string,
  categoryId: string,
  priceId: string;
const rentalIds: string[] = [];
after(async () => {
  if (rentalIds.length)
    await db.delete(rentals).where(inArray(rentals.id, rentalIds));
  if (cameraId) await db.delete(cameras).where(eq(cameras.id, cameraId));
  if (secondCameraId)
    await db.delete(cameras).where(eq(cameras.id, secondCameraId));
  if (categoryId)
    await db.delete(categories).where(eq(categories.id, categoryId));
  await db.delete(user).where(eq(user.id, userId));
  await closeDatabase();
});
test("inclusive dates, overlap boundaries and irreversible transitions", () => {
  assert.equal(rentalDays("2030-01-01", "2030-01-01"), 1);
  assert.equal(rentalDays("2030-01-01", "2030-01-07"), 7);
  assert.ok(overlaps("2030-01-01", "2030-01-03", "2030-01-03", "2030-01-04"));
  assert.ok(!overlaps("2030-01-01", "2030-01-03", "2030-01-04", "2030-01-06"));
  assert.deepEqual(transitions.COMPLETED, []);
  assert.deepEqual(transitions.CANCELLED, []);
});
test("reject invalid booking payloads, unsafe URLs and disguised uploads", () => {
  for (const url of [
    "/\\attacker.example",
    "/\n/attacker.example",
    "https://",
    "https://user:secret@example.com",
  ]) {
    assert.equal(safeUrl.safeParse(url).success, false, url);
  }
  assert.equal(safeUrl.safeParse("/cameras?q=sony").success, true);
  assert.equal(
    safeUrl.safeParse("https://example.com/image.webp").success,
    true,
  );
  assert.equal(
    bookingSchema.safeParse({ cameraId: "x", quantity: -1 }).success,
    false,
  );
  assert.equal(safeUrl.safeParse("javascript:alert(1)").success, false);
  assert.equal(safeUrl.safeParse("//attacker.example").success, false);
  assert.equal(
    imageType(new TextEncoder().encode("<svg onload='x'>bad</svg>")),
    null,
  );
  assert.deepEqual(
    imageType(
      new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 0, 0, 0, 0, 0]),
    ),
    { mime: "image/png", extension: "png" },
  );
});
test("inventory uses peak simultaneous demand with inclusive return dates", () => {
  const rows = [
    { startDate: "2030-01-01", endDate: "2030-01-02", quantity: 2 },
    { startDate: "2030-01-03", endDate: "2030-01-04", quantity: 2 },
  ];
  assert.equal(peakReserved(rows, "2030-01-01", "2030-01-04"), 2);
  assert.equal(
    peakReserved(
      [
        ...rows,
        { startDate: "2030-01-02", endDate: "2030-01-03", quantity: 1 },
      ],
      "2030-01-01",
      "2030-01-04",
    ),
    3,
  );
  assert.equal(peakReserved(rows, "2030-01-05", "2030-01-06"), 0);
});
test("PostgreSQL booking prices, concurrency, overlap and cancellation", async () => {
  await db.insert(user).values({
    id: userId,
    name: "Integration test",
    email: `${userId}@example.invalid`,
  });
  const [category] = await db
    .insert(categories)
    .values({ name: "Test", slug: `test-${suffix}` })
    .returning();
  categoryId = category.id;
  const [camera] = await db
    .insert(cameras)
    .values({
      name: "Test camera",
      slug: `test-${suffix}`,
      brand: "Test",
      model: "Test",
      description: "Test",
      shortDescription: "Test",
      categoryId,
      quantity: 1,
      deposit: 100000,
    })
    .returning();
  cameraId = camera.id;
  const [price] = await db
    .insert(rentalPrices)
    .values({ cameraId, name: "2 days", durationDays: 2, price: 80000 })
    .returning();
  priceId = price.id;
  const input = {
    cameraId,
    rentalPriceId: priceId,
    startDate: "2030-01-01",
    endDate: "2030-01-02",
    quantity: 1,
    subtotal: 1,
    deposit: 1,
    totalAmount: 2,
  };
  await assert.rejects(
    createBooking(userId, {
      ...input,
      startDate: "2020-01-01",
      endDate: "2020-01-02",
    }),
    /quá khứ/,
  );
  await assert.rejects(
    createBooking(userId, { ...input, endDate: "2030-01-03" }),
    /khớp/,
  );
  await assert.rejects(
    createBooking(userId, { ...input, quantity: 2 }),
    /không còn trống/,
  );
  const first = await createBooking(userId, input);
  rentalIds.push(first.id);
  const second = await createBooking(userId, input);
  rentalIds.push(second.id);
  assert.equal(first.subtotal, 80000);
  assert.equal(first.deposit, 100000);
  assert.equal(first.totalAmount, 180000);
  assert.equal(
    await getAvailability(cameraId, input.startDate, input.endDate),
    1,
    "Pending orders do not reserve inventory",
  );
  const results = await Promise.allSettled([
    changeRentalStatus(first.id, "CONFIRMED"),
    changeRentalStatus(second.id, "CONFIRMED"),
  ]);
  assert.equal(
    results.filter((r) => r.status === "fulfilled").length,
    1,
    "Only one overlapping confirmation may win",
  );
  const [confirmed] = await db
    .select()
    .from(rentals)
    .where(eq(rentals.status, "CONFIRMED"))
    .then((rows) => rows.filter((r) => rentalIds.includes(r.id)));
  assert.equal(
    await getAvailability(cameraId, "2030-01-02", "2030-01-03"),
    0,
    "Shared end/start date counts as overlap",
  );
  assert.equal(await getAvailability(cameraId, "2030-01-03", "2030-01-04"), 1);
  await assert.rejects(createBooking(userId, input), /không còn trống/);
  await assert.rejects(
    changeRentalStatus(confirmed.id, "RENTING"),
    /Chưa đến ngày/,
  );
  await db
    .update(rentalPrices)
    .set({ price: 90000 })
    .where(eq(rentalPrices.id, priceId));
  const [item] = await db
    .select()
    .from(rentalItems)
    .where(eq(rentalItems.rentalId, confirmed.id));
  assert.equal(
    item.unitPrice,
    80000,
    "Historical price snapshot remains unchanged",
  );
  await changeRentalStatus(confirmed.id, "CANCELLED");
  assert.equal(
    await getAvailability(cameraId, input.startDate, input.endDate),
    1,
  );
  await assert.rejects(
    changeRentalStatus(confirmed.id, "CONFIRMED"),
    /Không thể/,
  );
  await db.update(cameras).set({ quantity: 2 }).where(eq(cameras.id, cameraId));
  const earlier = await createBooking(userId, input);
  rentalIds.push(earlier.id);
  const later = await createBooking(userId, {
    ...input,
    startDate: "2030-01-03",
    endDate: "2030-01-04",
  });
  rentalIds.push(later.id);
  await changeRentalStatus(earlier.id, "CONFIRMED");
  await changeRentalStatus(later.id, "CONFIRMED");
  assert.equal(
    await getAvailability(cameraId, "2030-01-01", "2030-01-04"),
    1,
    "Disjoint reservations do not add together",
  );
  await db
    .update(categories)
    .set({ isActive: false })
    .where(eq(categories.id, categoryId));
  assert.equal(await getAvailability(cameraId, "2030-01-01", "2030-01-04"), 0);
  await assert.rejects(createBooking(userId, input), /không còn trống/);
  await db
    .update(categories)
    .set({ isActive: true })
    .where(eq(categories.id, categoryId));
  await db
    .update(rentals)
    .set({ status: "RENTING", startDate: "2020-01-01", endDate: "2020-01-02" })
    .where(eq(rentals.id, earlier.id));
  assert.equal(
    await getAvailability(cameraId, "2030-01-03", "2030-01-04"),
    0,
    "Overdue equipment remains reserved until returned",
  );
  await changeRentalStatus(earlier.id, "COMPLETED");
  assert.equal(await getAvailability(cameraId, "2030-01-03", "2030-01-04"), 1);
  const [otherCamera] = await db
    .insert(cameras)
    .values({ ...camera, id: undefined, slug: `second-${suffix}` })
    .returning();
  secondCameraId = otherCamera.id;
  const [otherPrice] = await db
    .insert(rentalPrices)
    .values({
      cameraId: secondCameraId,
      name: "2 days",
      durationDays: 2,
      price: 80000,
    })
    .returning();
  const future = { ...input, startDate: "2032-01-01", endDate: "2032-01-02" };
  // One earlier pending order remains. Fill up to nine, then race two cameras.
  for (let i = 0; i < 8; i++)
    rentalIds.push((await createBooking(userId, future)).id);
  const pendingRace = await Promise.allSettled([
    createBooking(userId, future),
    createBooking(userId, {
      ...future,
      cameraId: secondCameraId,
      rentalPriceId: otherPrice.id,
    }),
  ]);
  for (const result of pendingRace)
    if (result.status === "fulfilled") rentalIds.push(result.value.id);
  assert.equal(
    pendingRace.filter((result) => result.status === "fulfilled").length,
    1,
    "Concurrent bookings across cameras cannot exceed ten pending orders",
  );
  await db
    .update(cameras)
    .set({ status: "MAINTENANCE" })
    .where(eq(cameras.id, cameraId));
  await assert.rejects(createBooking(userId, input), /không còn trống/);
});
