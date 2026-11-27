import { test, after } from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import bmp from "bmp-js";
import { config } from "dotenv";
import { eq, inArray } from "drizzle-orm";
import {
  signUpSchema,
  zaloPhoneSchema,
  cameraRecipesSchema,
} from "../src/validators";
import {
  normalizeImage,
  InvalidImageError,
} from "../src/services/normalize-image";
import { detectImage, MAX_IMAGE_BYTES } from "../src/lib/image-formats";
config({ path: [".env.local", ".env"], quiet: true });
const url = process.env.TEST_DATABASE_URL;
if (!url || !["localhost", "127.0.0.1"].includes(new URL(url).hostname))
  throw new Error("Dedicated local TEST_DATABASE_URL required.");
process.env.DATABASE_URL = url;
const { db, closeDatabase } = await import("../src/db");
const { cameras, categories, cameraRecipes, cameraImages } =
  await import("../src/db/schema");
const { saveCameraRecipes } = await import("../src/services/camera-recipes");
const tag = crypto.randomUUID();
let categoryId: string;
const cameraIds: string[] = [];
after(async () => {
  if (cameraIds.length)
    await db.delete(cameras).where(inArray(cameras.id, cameraIds));
  if (categoryId)
    await db.delete(categories).where(eq(categories.id, categoryId));
  await closeDatabase();
});

test("Zalo validates new registration and normalizes Vietnamese mobile numbers", () => {
  assert.equal(zaloPhoneSchema.parse("+84 901 234 567"), "0901234567");
  assert.equal(zaloPhoneSchema.parse("0901.234.567"), "0901234567");
  for (const invalid of [
    "",
    "123456",
    "0123456789",
    "+12025550123",
    "09012345678",
    "<script>",
  ])
    assert.equal(zaloPhoneSchema.safeParse(invalid).success, false);
  assert.equal(
    signUpSchema.safeParse({
      name: "Khách",
      email: "test@example.com",
      password: "Password12345",
    }).success,
    false,
  );
});

test("upload decodes and normalizes supported raster formats, including empty browser MIME", async () => {
  for (const format of [
    "jpeg",
    "png",
    "webp",
    "gif",
    "avif",
    "tiff",
  ] as const) {
    const input = await sharp({
      create: { width: 24, height: 16, channels: 3, background: "#c04060" },
    })
      .toFormat(format)
      .toBuffer();
    const output = await normalizeImage(input);
    assert.equal(detectImage(output), "webp", format);
    const metadata = await sharp(output).metadata();
    assert.equal(metadata.width, 24, format);
    assert.equal(metadata.height, 16, format);
  }
  const pixels = Buffer.from(
    Array.from({ length: 24 * 16 }, () => [255, 0, 0, 255]).flat(),
  );
  const output = await normalizeImage(
    bmp.encode({ width: 24, height: 16, data: pixels }).data,
  );
  assert.equal((await sharp(output).metadata()).width, 24);
});

test("upload rejects spoofed, truncated, oversized and excessive-dimension images", async () => {
  for (const input of [
    Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>',
    ),
    Buffer.from("<html>not an image</html>"),
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, ...new Array(20).fill(0)]),
    new Uint8Array(MAX_IMAGE_BYTES + 1),
  ]) {
    await assert.rejects(normalizeImage(input), InvalidImageError);
  }
  const huge = await sharp({
    create: { width: 12001, height: 1, channels: 3, background: "white" },
  })
    .png()
    .toBuffer();
  await assert.rejects(normalizeImage(huge), InvalidImageError);
});

test("recipe images belong to one camera; edits are atomic and preserve product images", async () => {
  const [category] = await db
    .insert(categories)
    .values({ name: "Recipe test", slug: `recipe-${tag}` })
    .returning();
  categoryId = category.id;
  for (let i = 0; i < 2; i++) {
    const [camera] = await db
      .insert(cameras)
      .values({
        name: "Recipe test",
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
  await db
    .insert(cameraImages)
    .values({
      cameraId: cameraIds[0],
      imageUrl: "/old-product.jpg",
      isPrimary: true,
    });
  await db.transaction((tx) =>
    saveCameraRecipes(tx, cameraIds[0], [
      { imageUrl: "/formula-1.webp", displayOrder: 0 },
      { imageUrl: "/formula-2.webp", displayOrder: 1 },
    ]),
  );
  const images = await db
    .select()
    .from(cameraRecipes)
    .where(eq(cameraRecipes.cameraId, cameraIds[0]))
    .orderBy(cameraRecipes.displayOrder);
  assert.equal(images.length, 2);
  await assert.rejects(
    db.transaction((tx) =>
      saveCameraRecipes(tx, cameraIds[1], [
        { ...images[0], imageUrl: "/stolen.webp" },
      ]),
    ),
  );
  assert.equal(
    (
      await db
        .select()
        .from(cameraRecipes)
        .where(eq(cameraRecipes.cameraId, cameraIds[1]))
    ).length,
    0,
  );
  await db.transaction((tx) =>
    saveCameraRecipes(tx, cameraIds[0], [
      { ...images[1], imageUrl: "/replacement.webp", displayOrder: 0 },
    ]),
  );
  const remaining = await db
    .select()
    .from(cameraRecipes)
    .where(eq(cameraRecipes.cameraId, cameraIds[0]));
  assert.equal(remaining.length, 1);
  assert.equal(remaining[0].id, images[1].id);
  assert.equal(remaining[0].imageUrl, "/replacement.webp");
  assert.equal(
    (
      await db
        .select()
        .from(cameraImages)
        .where(eq(cameraImages.cameraId, cameraIds[0]))
    )[0].imageUrl,
    "/old-product.jpg",
  );
  assert.equal(
    cameraRecipesSchema.safeParse([
      { ...remaining[0], imageUrl: "javascript:alert(1)" },
    ]).success,
    false,
  );
});
