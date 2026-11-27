import { test, after } from "node:test";
import assert from "node:assert/strict";
import { config } from "dotenv";
import { eq, inArray } from "drizzle-orm";
import { cameraImagesSchema, feedbackSchema } from "../src/validators";
config({ path: [".env.local", ".env"], quiet: true });
const url = process.env.TEST_DATABASE_URL;
if (!url || !["localhost", "127.0.0.1"].includes(new URL(url).hostname))
  throw new Error("Local TEST_DATABASE_URL required.");
process.env.DATABASE_URL = url;
const { db, closeDatabase } = await import("../src/db");
const { cameras, categories, cameraImages, feedbacks } =
  await import("../src/db/schema");
const { saveCameraImages, ensurePrimaryImage } =
  await import("../src/services/camera-images");
const { getFeedbacks } = await import("../src/services/catalog");
const tag = crypto.randomUUID();
const cameraIds: string[] = [],
  feedbackIds: string[] = [];
let categoryId: string;
after(async () => {
  if (cameraIds.length)
    await db.delete(cameras).where(inArray(cameras.id, cameraIds));
  if (feedbackIds.length)
    await db.delete(feedbacks).where(inArray(feedbacks.id, feedbackIds));
  if (categoryId)
    await db.delete(categories).where(eq(categories.id, categoryId));
  await closeDatabase();
});

test("media validation allows image-only feedback and rejects duplicate primary/binary URLs", () => {
  const input = {
    imageUrl: "/uploads/feedback.png",
    isVisible: true,
    isFeatured: false,
    platform: "TIKTOK",
  };
  const parsed = feedbackSchema.parse(input);
  assert.equal(parsed.content, "");
  assert.equal(parsed.customerName, "");
  assert.equal(
    feedbackSchema.safeParse({ ...input, platform: "INVALID" }).success,
    false,
  );
  assert.equal(
    feedbackSchema.safeParse({
      ...input,
      imageUrl: "data:image/png;base64,binary",
    }).success,
    false,
  );
  assert.equal(
    feedbackSchema.safeParse({ ...input, imageUrl: "" }).success,
    false,
  );
  assert.equal(
    feedbackSchema.safeParse({ ...input, socialUrl: "javascript:alert(1)" })
      .success,
    false,
  );
  const image = {
    imageUrl: "/uploads/test.png",
    displayOrder: 0,
    isPrimary: true,
  };
  assert.equal(cameraImagesSchema.safeParse([image, image]).success, false);
});

test("product images support atomic add, replace, reorder, delete and one primary", async () => {
  const [category] = await db
    .insert(categories)
    .values({ name: "Media test", slug: tag })
    .returning();
  categoryId = category.id;
  for (let i = 0; i < 2; i++) {
    const [camera] = await db
      .insert(cameras)
      .values({
        name: "Media test",
        slug: `${tag}-${i}`,
        brand: "Test",
        model: "Test",
        description: "Test",
        shortDescription: "Test",
        deposit: 0,
        categoryId,
      })
      .returning();
    cameraIds.push(camera.id);
  }
  await db.transaction((tx) =>
    saveCameraImages(tx, cameraIds[0], [
      { imageUrl: "/uploads/one.png", displayOrder: 0, isPrimary: true },
      { imageUrl: "/uploads/two.png", displayOrder: 1, isPrimary: false },
      { imageUrl: "/uploads/three.png", displayOrder: 2, isPrimary: false },
    ]),
  );
  const read = () =>
    db
      .select()
      .from(cameraImages)
      .where(eq(cameraImages.cameraId, cameraIds[0]))
      .orderBy(cameraImages.displayOrder);
  const initial = await read();
  assert.equal(initial.length, 3);
  assert.equal(initial.filter((image) => image.isPrimary).length, 1);
  assert.ok(initial[0].createdAt instanceof Date);
  await db.transaction((tx) =>
    saveCameraImages(tx, cameraIds[0], [
      { ...initial[2], imageUrl: "/uploads/replaced.png", isPrimary: true },
      { ...initial[0], isPrimary: false },
    ]),
  );
  const changed = await read();
  assert.deepEqual(
    changed.map((image) => image.id),
    [initial[2].id, initial[0].id],
  );
  assert.deepEqual(
    changed.map((image) => image.displayOrder),
    [0, 1],
  );
  assert.equal(changed[0].imageUrl, "/uploads/replaced.png");
  assert.equal(changed[0].isPrimary, true);
  assert.equal(changed[0].createdAt.getTime(), initial[2].createdAt.getTime());
  await assert.rejects(
    db.transaction((tx) => saveCameraImages(tx, cameraIds[1], changed)),
    /không thuộc/,
  );
  await assert.rejects(
    db.transaction((tx) =>
      saveCameraImages(
        tx,
        cameraIds[0],
        changed.map((image) => ({ ...image, isPrimary: true })),
      ),
    ),
    /đại diện/,
  );
  assert.equal(
    (await read()).length,
    2,
    "Invalid updates do not partially delete images",
  );
  await db.transaction(async (tx) => {
    await tx
      .select()
      .from(cameras)
      .where(eq(cameras.id, cameraIds[0]))
      .for("update");
    await tx.delete(cameraImages).where(eq(cameraImages.id, changed[0].id));
    await ensurePrimaryImage(tx, cameraIds[0]);
  });
  assert.equal(
    (await read())[0].isPrimary,
    true,
    "Deleting a primary promotes a remaining image",
  );
  await db.transaction((tx) => saveCameraImages(tx, cameraIds[0], []));
  assert.equal((await read()).length, 0);
});

test("feedback URLs, visibility, featured priority and display ordering persist", async () => {
  const rows = await db
    .insert(feedbacks)
    .values([
      {
        imageUrl: "/uploads/a.png",
        platform: "FACEBOOK",
        socialUrl: "https://www.facebook.com/",
        displayOrder: 1,
        isFeatured: true,
      },
      {
        imageUrl: "/uploads/b.png",
        platform: "TIKTOK",
        displayOrder: 0,
        isFeatured: true,
      },
      { imageUrl: "/uploads/hidden.png", isVisible: false },
    ])
    .returning();
  feedbackIds.push(...rows.map((row) => row.id));
  const visible = (await getFeedbacks()).filter((row) =>
    feedbackIds.includes(row.id),
  );
  assert.deepEqual(
    visible.map((row) => row.id),
    [rows[1].id, rows[0].id],
  );
  assert.equal(visible[1].socialUrl, "https://www.facebook.com/");
  await db
    .update(feedbacks)
    .set({
      imageUrl: "/uploads/replaced-feedback.png",
      isFeatured: false,
      displayOrder: 4,
    })
    .where(eq(feedbacks.id, rows[0].id));
  const [updated] = await db
    .select()
    .from(feedbacks)
    .where(eq(feedbacks.id, rows[0].id));
  assert.equal(updated.imageUrl, "/uploads/replaced-feedback.png");
  assert.equal(updated.content, "");
  await db.delete(feedbacks).where(eq(feedbacks.id, rows[1].id));
  assert.equal(
    (await db.select().from(feedbacks).where(eq(feedbacks.id, rows[1].id)))
      .length,
    0,
  );
});
