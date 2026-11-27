import { chromium, expect } from "@playwright/test";
import { Pool } from "pg";
import { hashPassword } from "better-auth/crypto";
import { randomUUID, randomBytes } from "node:crypto";
import { mkdir } from "node:fs/promises";
import { testDatabaseUrl } from "./test-environment.mjs";

const base = process.env.TEST_BASE_URL || "http://localhost:3004";
if (!["localhost", "127.0.0.1"].includes(new URL(base).hostname))
  throw new Error("Local test server required.");
const pool = new Pool({ connectionString: testDatabaseUrl });
const browser = await chromium.launch({ channel: "msedge", headless: true });
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  hasTouch: true,
  serviceWorkers: "block",
});
const page = await context.newPage();
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
const id = randomUUID(),
  tag = `Media-${id.slice(0, 8)}`,
  email = `${tag.toLowerCase()}@example.invalid`,
  password = randomBytes(24).toString("base64url");
let cameraId, feedbackId;
const save = () =>
  page.getByRole("button", { name: "Lưu thay đổi", exact: true }).click();
const cameraRow = () => page.getByRole("row").filter({ hasText: tag });
async function editCamera() {
  await page.goto(`${base}/admin/cameras`);
  await cameraRow()
    .getByRole("button", { name: "Chỉnh sửa", exact: true })
    .click();
}
try {
  await mkdir(".local/screenshots", { recursive: true });
  await pool.query(
    "insert into users(id,name,email,role) values($1,$2,$3,'ADMIN')",
    [id, tag, email],
  );
  await pool.query(
    "insert into auth_accounts(id,account_id,provider_id,user_id,password) values($1,$2,'credential',$2,$3)",
    [randomUUID(), id, await hashPassword(password)],
  );
  const response = await context.request.post(
    `${base}/api/auth/sign-in/email`,
    { headers: { Origin: base }, data: { email, password } },
  );
  expect(response.ok()).toBe(true);
  await page.goto(`${base}/admin/cameras`);
  await page
    .getByRole("button", { name: "Thêm thiết bị", exact: true })
    .click();
  for (const [label, value] of Object.entries({
    "Tên thiết bị": tag,
    Slug: tag.toLowerCase(),
    "Thương hiệu": "Test",
    Model: "Test",
    "Mô tả ngắn": "Test",
    "Mô tả chi tiết": "Test",
    "Tiền cọc (đ)": "100000",
    "Số lượng thiết bị": "2",
  }))
    await page.getByLabel(label, { exact: true }).fill(value);
  await page
    .getByRole("dialog")
    .getByLabel("Danh mục", { exact: true })
    .selectOption({ index: 1 });
  await page
    .getByLabel("Thêm nhiều ảnh", { exact: true })
    .setInputFiles(["public/icons/icon-192.png", "public/images/logo.png"]);
  await expect(page.locator(".product-image-preview")).toHaveCount(2);
  await page.getByLabel("Ảnh đại diện 2", { exact: true }).check();
  await page
    .getByRole("button", { name: "Đưa ảnh 2 lên", exact: true })
    .click();
  await expect(
    page.getByLabel("Ảnh đại diện 1", { exact: true }),
  ).toBeChecked();
  await page.screenshot({
    path: ".local/screenshots/product-images-admin-mobile.png",
    fullPage: true,
  });
  await save();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  cameraId = (
    await pool.query("select id from cameras where slug=$1", [
      tag.toLowerCase(),
    ])
  ).rows[0].id;
  let images = (
    await pool.query(
      "select * from camera_images where camera_id=$1 order by display_order",
      [cameraId],
    )
  ).rows;
  expect(images.length).toBe(2);
  expect(images.filter((image) => image.is_primary).length).toBe(1);
  expect(images[0].is_primary).toBe(true);
  const primaryId = images[0].id;
  const originalUrl = images[0].image_url;
  await editCamera();
  await page
    .getByLabel("Thay ảnh 1", { exact: true })
    .setInputFiles("public/images/logo.jpg");
  await expect(
    page.locator(".product-image-preview").first(),
  ).not.toHaveAttribute("src", originalUrl);
  await page.getByRole("button", { name: "Xóa ảnh 2", exact: true }).click();
  await save();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  images = (
    await pool.query("select * from camera_images where camera_id=$1", [
      cameraId,
    ])
  ).rows;
  expect(images.length).toBe(1);
  expect(images[0].id).toBe(primaryId);
  expect(images[0].image_url).not.toBe(originalUrl);
  await editCamera();
  await page
    .getByLabel("Thêm nhiều ảnh", { exact: true })
    .setInputFiles("public/icons/icon-512.png");
  await expect(page.locator(".product-image-preview")).toHaveCount(2);
  await page.getByLabel("Ảnh đại diện 2", { exact: true }).check();
  await save();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  images = (
    await pool.query(
      "select * from camera_images where camera_id=$1 order by display_order",
      [cameraId],
    )
  ).rows;
  await page.goto(`${base}/cameras?q=${tag}`);
  await expect(page.locator(".camera-card")).toHaveCount(1);
  await expect(page.locator(".camera-photo img")).toHaveAttribute(
    "src",
    images[1].image_url,
  );
  await page.goto(`${base}/cameras/${tag.toLowerCase()}`);
  await expect(page.locator(".gallery-main")).toHaveAttribute(
    "src",
    images[1].image_url,
  );
  await page.getByRole("button", { name: "Ảnh trước", exact: true }).click();
  await expect(page.locator(".gallery-main")).toHaveAttribute(
    "src",
    images[0].image_url,
  );
  await page.locator(".gallery-stage").evaluate((element) => {
    const touch = (x) =>
      new Touch({ identifier: 1, target: element, clientX: x, clientY: 150 });
    element.dispatchEvent(
      new TouchEvent("touchstart", { bubbles: true, touches: [touch(250)] }),
    );
    element.dispatchEvent(
      new TouchEvent("touchend", {
        bubbles: true,
        changedTouches: [touch(70)],
      }),
    );
  });
  await expect(page.locator(".gallery-main")).toHaveAttribute(
    "src",
    images[1].image_url,
  );
  expect(
    await page
      .locator(".gallery-main")
      .evaluate((image) => getComputedStyle(image).objectFit),
  ).toBe("contain");
  console.log(
    "Product multi-upload, preview, replacement, per-image deletion, primary, ordering, card and mobile swipe passed",
  );

  const fixturePage = await context.newPage();
  await fixturePage.setViewportSize({ width: 320, height: 1600 });
  await fixturePage.setContent(
    '<main style="height:1560px;background:linear-gradient(#fce7f3,#dbeafe);padding:12px;display:flex;flex-direction:column;justify-content:space-between"><h1>Feedback test</h1><p>Full screenshot: bottom visible</p></main>',
  );
  const screenshot = await fixturePage.screenshot({ fullPage: true });
  await fixturePage.close();
  await page.goto(`${base}/admin/feedbacks`);
  await page
    .getByRole("button", { name: "Thêm đánh giá", exact: true })
    .click();
  await page
    .getByLabel("Tải ảnh feedback", { exact: true })
    .setInputFiles({
      name: "feedback-long.png",
      mimeType: "image/png",
      buffer: screenshot,
    });
  const imageField = page.getByLabel("Ảnh feedback", { exact: true });
  await expect(imageField).toHaveValue(/^\/uploads\//);
  const feedbackUrl = await imageField.inputValue();
  await page.getByLabel("Nền tảng", { exact: true }).selectOption("FACEBOOK");
  await page
    .getByLabel("Liên kết bài đăng", { exact: true })
    .fill("https://www.facebook.com/");
  await page.getByLabel("Ưu tiên trên trang chủ", { exact: true }).check();
  await save();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  const feedback = (
    await pool.query("select * from feedbacks where image_url=$1", [
      feedbackUrl,
    ])
  ).rows[0];
  feedbackId = feedback.id;
  expect(feedback.content).toBe("");
  expect(feedback.customer_name).toBe("");
  await page.goto(base);
  const card = page.locator(`[data-feedback-id="${feedbackId}"]`);
  await expect(card).toBeVisible();
  const social = card.getByRole("link", { name: "Xem trên Facebook" });
  await expect(social).toHaveAttribute("target", "_blank");
  await expect(social).toHaveAttribute("rel", "noopener noreferrer");
  expect(
    await card
      .locator(".feedback-photo")
      .evaluate((image) => getComputedStyle(image).objectFit),
  ).toBe("contain");
  await card.getByRole("button").click();
  await expect(page.getByRole("dialog")).toBeVisible();
  const large = page.locator(".feedback-full-image");
  await expect
    .poll(() =>
      large.evaluate((image) => image.complete && image.naturalWidth > 0),
    )
    .toBe(true);
  const ratio = await large.evaluate((image) => ({
    natural: image.naturalWidth / image.naturalHeight,
    rendered: image.clientWidth / image.clientHeight,
  }));
  expect(ratio.rendered).toBeCloseTo(ratio.natural, 2);
  await page.screenshot({
    path: ".local/screenshots/feedback-lightbox-mobile.png",
  });
  await page
    .getByRole("button", { name: "Đóng ảnh feedback", exact: true })
    .click();
  await page.goto(`${base}/admin/feedbacks`);
  const feedbackRow = () =>
    page
      .getByRole("row")
      .filter({ has: page.locator(`img[src="${feedbackUrl}"]`) });
  await feedbackRow()
    .getByRole("button", { name: "Chỉnh sửa", exact: true })
    .click();
  await page.getByLabel("Tên khách hàng", { exact: true }).fill(tag);
  await page
    .getByLabel("Tải ảnh feedback", { exact: true })
    .setInputFiles("public/images/logo.png");
  await expect(imageField).not.toHaveValue(feedbackUrl);
  await page.getByLabel("Nền tảng", { exact: true }).selectOption("TIKTOK");
  await page
    .getByLabel("Liên kết bài đăng", { exact: true })
    .fill("https://www.tiktok.com/");
  await page.getByLabel("Thứ tự hiển thị", { exact: true }).fill("3");
  await page.getByLabel("Hiển thị công khai", { exact: true }).uncheck();
  await page.getByLabel("Ưu tiên trên trang chủ", { exact: true }).uncheck();
  await save();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  const changed = (
    await pool.query("select * from feedbacks where id=$1", [feedbackId])
  ).rows[0];
  expect(changed.image_url).not.toBe(feedbackUrl);
  expect(changed.display_order).toBe(3);
  expect(changed.is_featured).toBe(false);
  await page.goto(base);
  await expect(page.locator(".feedback-carousel")).toBeVisible();
  await expect(card).toHaveCount(0);
  await page.goto(`${base}/admin/feedbacks`);
  await cameraRow()
    .getByRole("button", { name: "Chỉnh sửa", exact: true })
    .click();
  await page.getByLabel("Hiển thị công khai", { exact: true }).check();
  await save();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.goto(base);
  await expect(
    card.getByRole("link", { name: "Xem trên TikTok" }),
  ).toBeVisible();
  for (const path of [
    "/",
    `/cameras/${tag.toLowerCase()}`,
    "/admin/cameras",
    "/admin/feedbacks",
  ]) {
    await page.goto(base + path);
    await expect(page.locator("h1").first()).toBeVisible();
    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 850 });
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
        `${path} ${width}`,
      ).toBeLessThanOrEqual(width + 1);
    }
  }
  await page.goto(`${base}/admin/feedbacks`);
  await cameraRow().getByRole("button", { name: "Xóa", exact: true }).click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Xác nhận", exact: true })
    .click();
  await expect(cameraRow()).toHaveCount(0);
  expect(
    (await pool.query("select id from feedbacks where id=$1", [feedbackId]))
      .rows.length,
  ).toBe(0);
  expect(errors).toEqual([]);
  console.log(
    "Image-only feedback upload/CRUD, long-image modal, Facebook/TikTok links, visibility, featured/order and responsive layouts passed",
  );
} catch (error) {
  await page.screenshot({
    path: ".local/screenshots/media-failure.png",
    fullPage: true,
  });
  throw error;
} finally {
  await browser.close();
  if (cameraId) await pool.query("delete from cameras where id=$1", [cameraId]);
  else
    await pool.query("delete from cameras where slug=$1", [tag.toLowerCase()]);
  if (feedbackId)
    await pool.query("delete from feedbacks where id=$1", [feedbackId]);
  await pool.query("delete from users where id=$1", [id]);
  await pool.end();
}
