import { chromium, expect } from "@playwright/test";
import { Pool } from "pg";
import { hashPassword } from "better-auth/crypto";
import { randomUUID, randomBytes } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import sharp from "sharp";
import bmp from "bmp-js";
import { testDatabaseUrl } from "./test-environment.mjs";
const base = process.env.TEST_BASE_URL || "http://localhost:3010";
if (!["localhost", "127.0.0.1"].includes(new URL(base).hostname))
  throw Error("Local test server required");
const pool = new Pool({ connectionString: testDatabaseUrl });
const tag = randomUUID();
const adminId = "camera-check-" + tag;
const adminEmail = adminId + "@example.test";
const customerEmail = "customer-" + tag + "@example.test";
const password = randomBytes(18).toString("base64url");
const slug = "camera-check-" + tag;
const browser = await chromium.launch({ channel: "msedge", headless: true });
const admin = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  serviceWorkers: "block",
});
const mobile = await browser.newContext({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
  serviceWorkers: "block",
});
const page = await admin.newPage();
const customer = await mobile.newPage();
const errors = [];
for (const p of [page, customer])
  p.on("pageerror", (e) => errors.push(e.message));
let categoryId, cameraId;
const uploads = [];
page.on("response", async (r) => {
  if (r.url().endsWith("/api/upload") && r.ok()) {
    const j = await r.json();
    uploads.push(j.url);
  }
});
const report = { checks: [] };
const check = (name) => report.checks.push(name);
const png = await sharp({
  create: { width: 300, height: 900, channels: 3, background: "#eeccdd" },
})
  .png()
  .toBuffer();
const jpg = await sharp(png).jpeg().toBuffer();
const tiff = await sharp(png).tiff().toBuffer();
const bitmap = bmp.encode({
  width: 20,
  height: 20,
  data: Buffer.alloc(20 * 20 * 4, 180),
}).data;
try {
  await pool.query(
    "insert into users(id,name,email,role) values($1,$2,$3,$4)",
    [adminId, "Camera check admin", adminEmail, "ADMIN"],
  );
  await pool.query(
    "insert into auth_accounts(id,account_id,provider_id,user_id,password) values($1,$2,$3,$2,$4)",
    [randomUUID(), adminId, "credential", await hashPassword(password)],
  );
  categoryId = (
    await pool.query(
      "insert into categories(name,slug,icon) values($1,$2,$3) returning id",
      ["Máy ảnh kiểm thử", tag, "Camera"],
    )
  ).rows[0].id;
  await page.goto(base + "/login");
  await page.getByLabel("Email", { exact: true }).fill(adminEmail);
  await page.getByLabel("Mật khẩu", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await page.waitForURL("**/account");
  await page.goto(base + "/admin/cameras");
  await page
    .getByRole("button", { name: "Thêm thiết bị", exact: true })
    .click();
  await page
    .getByLabel("Tên thiết bị", { exact: true })
    .fill("Máy ảnh kiểm thử công thức");
  await page.getByLabel("Slug", { exact: true }).fill(slug);
  await page.getByLabel("Thương hiệu", { exact: true }).fill("Canon");
  await page.getByLabel("Model", { exact: true }).fill("R50");
  await page.getByLabel("Danh mục", { exact: true }).selectOption(categoryId);
  await page
    .getByLabel("Mô tả ngắn", { exact: true })
    .fill("Máy ảnh và bộ công thức riêng");
  await page
    .getByLabel("Mô tả chi tiết", { exact: true })
    .fill("Kiểm thử bộ ảnh sản phẩm và công thức chỉnh màu.");
  const products = page.getByRole("group", {
    name: "Hình ảnh sản phẩm",
    exact: true,
  });
  const recipes = page.getByRole("group", {
    name: "Công thức chỉnh màu của máy ảnh",
    exact: true,
  });
  const files = [
    { name: "photo.jpg", mimeType: "image/jpeg", buffer: jpg },
    { name: "photo.tiff", mimeType: "image/tiff", buffer: tiff },
    { name: "photo.bmp", mimeType: "image/bmp", buffer: bitmap },
  ];
  try {
    files.push({
      name: "photo.heic",
      mimeType: "image/heic",
      buffer: await readFile(".local/codec-example.heic"),
    });
  } catch {
    /* Optional downloaded HEIC fixture is checked separately. */
  }
  await products
    .getByLabel("Thêm nhiều ảnh", { exact: true })
    .setInputFiles(files);
  await expect(products.locator(".product-image-item")).toHaveCount(
    files.length,
    { timeout: 60000 },
  );
  await expect(
    page.getByRole("button", { name: "Lưu thay đổi", exact: true }),
  ).toBeEnabled();
  await products.getByLabel("Ảnh đại diện 2", { exact: true }).check();
  await recipes.getByLabel("Thêm nhiều ảnh", { exact: true }).setInputFiles([
    { name: "recipe-1.png", mimeType: "image/png", buffer: png },
    { name: "recipe-2.png", mimeType: "image/png", buffer: png },
  ]);
  await expect(recipes.locator(".product-image-item")).toHaveCount(2);
  await expect(
    page.getByRole("button", { name: "Lưu thay đổi", exact: true }),
  ).toBeEnabled();
  await recipes.evaluate(
    (el, bytes) => {
      const dt = new DataTransfer();
      dt.items.add(
        new File([new Uint8Array(bytes)], "dropped.png", { type: "image/png" }),
      );
      el.dispatchEvent(
        new DragEvent("drop", {
          bubbles: true,
          cancelable: true,
          dataTransfer: dt,
        }),
      );
    },
    [...png],
  );
  await expect(recipes.locator(".product-image-item")).toHaveCount(3);
  await expect(
    page.getByRole("button", { name: "Lưu thay đổi", exact: true }),
  ).toBeEnabled();
  await mkdir(".local/screenshots", { recursive: true });
  await page.screenshot({
    path: ".local/screenshots/camera-update-admin.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Lưu thay đổi", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
  cameraId = (await pool.query("select id from cameras where slug=$1", [slug]))
    .rows[0].id;
  let images = (
    await pool.query(
      "select * from camera_images where camera_id=$1 order by display_order",
      [cameraId],
    )
  ).rows;
  if (images.length !== files.length || !images[1].is_primary)
    throw Error("Product upload or primary failed");
  check(
    "Admin created camera with multiple JPG/TIFF/BMP/HEIC images and selected primary",
  );
  const savedRecipes = (
    await pool.query(
      "select * from camera_recipes where camera_id=$1 order by display_order",
      [cameraId],
    )
  ).rows;
  if (savedRecipes.length !== 3)
    throw Error("Recipe upload/drop persistence failed");
  check(
    "Recipe images saved against the correct camera; multi-select and drag/drop",
  );
  await page
    .getByLabel("Tìm trong danh sách", { exact: true })
    .fill("Máy ảnh kiểm thử công thức");
  await page.getByRole("button", { name: "Chỉnh sửa", exact: true }).click();
  await recipes
    .getByRole("button", { name: "Đưa ảnh 2 lên", exact: true })
    .click();
  await recipes
    .getByLabel("Thay ảnh 1", { exact: true })
    .setInputFiles({
      name: "replacement.png",
      mimeType: "image/png",
      buffer: png,
    });
  await expect(
    page.getByRole("button", { name: "Lưu thay đổi", exact: true }),
  ).toBeEnabled();
  await recipes.getByRole("button", { name: "Xóa ảnh 3", exact: true }).click();
  await page.getByRole("button", { name: "Lưu thay đổi", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
  const edited = (
    await pool.query(
      "select * from camera_recipes where camera_id=$1 order by display_order",
      [cameraId],
    )
  ).rows;
  if (
    edited.length !== 2 ||
    edited[0].id !== savedRecipes[1].id ||
    edited[0].image_url === savedRecipes[1].image_url
  )
    throw Error("Recipe edit/reorder/delete failed");
  images = (
    await pool.query("select * from camera_images where camera_id=$1", [
      cameraId,
    ])
  ).rows;
  if (images.length !== files.length)
    throw Error("Recipe editing affected product images");
  check("Recipe replace/reorder/delete retained product images");
  await customer.goto(base + "/register");
  await customer
    .getByLabel("Họ và tên", { exact: true })
    .fill("Khách kiểm thử Zalo");
  await customer.getByLabel("Email", { exact: true }).fill(customerEmail);
  await customer
    .getByLabel("Số điện thoại sử dụng Zalo", { exact: true })
    .fill("+84 901 234 567");
  await customer.getByLabel("Mật khẩu", { exact: true }).fill(password);
  await customer.getByRole("button", { name: "Đăng ký", exact: true }).click();
  await customer.waitForURL("**/account");
  await expect(
    customer.getByLabel("Số điện thoại sử dụng Zalo", { exact: true }),
  ).toHaveValue("0901234567");
  check("Mobile registration stored normalized Zalo number");
  await customer
    .getByLabel("Số điện thoại sử dụng Zalo", { exact: true })
    .fill("0987654321");
  await customer
    .getByRole("button", { name: "Lưu thông tin", exact: true })
    .click();
  await expect
    .poll(
      async () =>
        (
          await pool.query("select phone from users where email=$1", [
            customerEmail,
          ])
        ).rows[0].phone,
    )
    .toBe("0987654321");
  const invalid = await mobile.request.post(base + "/api/auth/update-user", {
    headers: { Origin: base },
    data: { phone: "123" },
  });
  if (invalid.ok()) throw Error("Backend accepted invalid Zalo number");
  const missing = await admin.request.post(base + "/api/auth/sign-up/email", {
    headers: { Origin: base },
    data: {
      name: "Missing",
      email: "missing-" + tag + "@example.test",
      password,
    },
  });
  if (missing.ok()) throw Error("Backend accepted registration without Zalo");
  check("Profile updates Zalo; backend rejects missing/invalid phone");
  await customer.goto(base + "/cameras/" + slug);
  await expect(
    customer.getByRole("heading", {
      name: "Công thức chỉnh màu cho Máy ảnh kiểm thử công thức",
      exact: true,
    }),
  ).toBeVisible();
  await expect(customer.locator(".camera-recipe-section img")).toHaveCount(2);
  await customer
    .getByRole("button", { name: /Xem lớn .*Công thức chỉnh màu 1/ })
    .click();
  await expect(customer.getByRole("dialog")).toBeVisible();
  await customer.screenshot({
    path: ".local/screenshots/camera-recipe-mobile.png",
    fullPage: false,
  });
  await customer
    .getByRole("button", { name: "Đóng ảnh công thức", exact: true })
    .click();
  for (const width of [320, 390, 768, 1440]) {
    await customer.setViewportSize({ width, height: 900 });
    const overflow = await customer.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    );
    if (overflow) throw Error("Horizontal overflow at " + width);
  }
  check("Recipe gallery opens full-size and works at 320/390/768/1440px");
  await page.goto(base + "/admin/users");
  await page.getByLabel("Tìm người dùng", { exact: true }).fill(customerEmail);
  await expect(
    page.getByRole("cell", { name: "0987654321", exact: true }),
  ).toBeVisible();
  check("Admin sees customer Zalo");
  await pool.query(
    "insert into rental_prices(camera_id,name,duration_days,price) values($1,$2,1,150000)",
    [cameraId, "Gói kiểm thử 1 ngày"],
  );
  await customer.setViewportSize({ width: 390, height: 844 });
  await customer.goto(base + "/cameras/" + slug);
  await customer.getByLabel("Ngày nhận", { exact: true }).fill("2030-01-01");
  await expect(
    customer
      .locator(".booking-panel")
      .getByRole("button", { name: "Đặt thuê", exact: true }),
  ).toBeEnabled();
  await customer
    .locator(".booking-panel")
    .getByRole("button", { name: "Đặt thuê", exact: true })
    .click();
  await customer.waitForURL("**/rentals");
  await expect(
    customer.getByText("Máy ảnh kiểm thử công thức", { exact: true }),
  ).toBeVisible();
  const rental = (
    await pool.query(
      "select r.rental_code from rentals r join users u on u.id=r.user_id where u.email=$1",
      [customerEmail],
    )
  ).rows[0];
  await page.goto(base + "/admin/rentals");
  await page
    .getByLabel("Tìm đơn thuê", { exact: true })
    .fill(rental.rental_code);
  await page
    .getByRole("button", {
      name: "Chi tiết " + rental.rental_code,
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("dialog").getByText("0987654321", { exact: true }),
  ).toBeVisible();
  check("Customer booking still works; Admin rental details show Zalo");
  const denied = await mobile.request.post(base + "/api/upload", {
    headers: { Origin: base },
    multipart: {
      file: { name: "fake.png", mimeType: "image/png", buffer: png },
    },
  });
  if (denied.status() !== 403) throw Error("Customer upload not denied");
  const spoof = await admin.request.post(base + "/api/upload", {
    headers: { Origin: base },
    multipart: {
      file: {
        name: "fake.jpg",
        mimeType: "image/jpeg",
        buffer: Buffer.from("<svg><script>alert(1)</script></svg>"),
      },
    },
  });
  if (spoof.status() !== 400) throw Error("Spoofed image accepted");
  check("Upload rejects customer permissions and fake image content");
  if (errors.length) throw Error("Browser errors: " + errors.join("; "));
  report.ok = true;
  console.log(JSON.stringify(report, null, 2));
} finally {
  await writeFile(
    ".local/camera-update-results.json",
    JSON.stringify({ ...report, errors }, null, 2),
  );
  await pool.query(
    "delete from rentals where user_id in (select id from users where email=$1)",
    [customerEmail],
  );
  if (cameraId) await pool.query("delete from cameras where id=$1", [cameraId]);
  if (categoryId)
    await pool.query("delete from categories where id=$1", [categoryId]);
  await pool.query("delete from users where id=$1 or email=$2", [
    adminId,
    customerEmail,
  ]);
  await browser.close();
  await pool.end();
}
