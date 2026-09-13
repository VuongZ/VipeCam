import { chromium, expect } from "@playwright/test";
import { Pool } from "pg";
import { hashPassword } from "better-auth/crypto";
import { randomUUID, randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { testDatabaseUrl } from "./test-environment.mjs";
const base = process.env.TEST_BASE_URL || "http://localhost:3000";
const databaseUrl = testDatabaseUrl;
if (
  !["localhost", "127.0.0.1"].includes(new URL(base).hostname) ||
  !["localhost", "127.0.0.1"].includes(new URL(databaseUrl).hostname)
)
  throw new Error("E2E tests require dedicated local services.");
const pool = new Pool({ connectionString: databaseUrl });
const browser = await chromium.launch({ channel: "msedge", headless: true });
const prefix = `QA-${randomUUID().slice(0, 8)}`;
const password = randomBytes(24).toString("base64url");
const customerEmail = `${prefix.toLowerCase()}@example.invalid`;
const adminEmail = `${prefix.toLowerCase()}-admin@example.invalid`;
const adminId = randomUUID();
const reports = [];
const errors = [];
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
});
const page = await context.newPage();
page.on("pageerror", (error) => errors.push(error.message));
try {
  await mkdir(".local/screenshots", { recursive: true });
  await pool.query(
    "INSERT INTO users (id,name,email,role) VALUES ($1,$2,$3,$4)",
    [adminId, `${prefix} Admin`, adminEmail, "ADMIN"],
  );
  await pool.query(
    "INSERT INTO auth_accounts (id,account_id,provider_id,user_id,password) VALUES ($1,$2,$3,$4,$5)",
    [
      randomUUID(),
      adminId,
      "credential",
      adminId,
      await hashPassword(password),
    ],
  );
  await page.goto(`${base}/admin`);
  await expect(page).toHaveURL(/\/login$/);
  reports.push("Anonymous admin access redirects to login");
  await page.goto(`${base}/register`);
  await page
    .getByLabel("Họ và tên", { exact: true })
    .fill(`${prefix} Customer`);
  await page.getByLabel("Email", { exact: true }).fill(customerEmail);
  await page.getByLabel("Mật khẩu", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Đăng ký", exact: true }).click();
  await expect(page).toHaveURL(/\/account$/, { timeout: 20000 });
  await expect(
    page.getByRole("heading", { name: `Xin chào, ${prefix} Customer.` }),
  ).toBeVisible();
  const authData = await pool.query(
    "select u.role,a.password from users u join auth_accounts a on u.id=a.user_id where u.email=$1",
    [customerEmail],
  );
  if (
    authData.rows[0].role !== "CUSTOMER" ||
    authData.rows[0].password === password
  )
    throw new Error("Invalid account role or plaintext password");
  await page.goto(`${base}/admin/cameras`);
  await expect(page).toHaveURL(/\/account$/);
  reports.push("Customer cannot access admin; password is hashed");
  const denied = await context.request.post(`${base}/api/upload`, {
    headers: { Origin: base },
    multipart: {
      file: {
        name: "bad.svg",
        mimeType: "image/svg+xml",
        buffer: Buffer.from("<svg/>"),
      },
    },
  });
  expect(denied.status()).toBe(403);
  await page.goto(`${base}/cameras`);
  await page.getByRole("textbox", { name: "Tìm thiết bị" }).fill("Fujifilm");
  await expect(page.locator(".camera-card")).toHaveCount(1);
  await page.goto(`${base}/cameras/sony-a7-iv`);
  await expect(page.getByText(/Còn 3 thiết bị/)).toBeVisible();
  await page.getByRole("button", { name: "2 ngày", exact: false }).click();
  await page.getByLabel("Ghi chú").fill(prefix);
  await page
    .locator("#booking")
    .getByRole("button", { name: "Đặt thuê", exact: true })
    .click();
  await expect(page).toHaveURL(/\/rentals$/, { timeout: 20000 });
  await expect(page.locator(".rental-list .panel")).toHaveCount(1);
  await expect(
    page.getByText("Chờ xác nhận", { exact: true }).last(),
  ).toBeVisible();
  reports.push(
    "Search, price selection and customer booking persist to PostgreSQL",
  );
  const [rental] = (
    await pool.query(
      "select r.* from rentals r join users u on r.user_id=u.id where u.email=$1",
      [customerEmail],
    )
  ).rows;
  expect(rental.subtotal).toBe(900000);
  expect(rental.deposit).toBe(10000000);
  await page.goto(`${base}/account`);
  await page.getByRole("button", { name: "Đăng xuất", exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.getByLabel("Email", { exact: true }).fill(adminEmail);
  await page.getByLabel("Mật khẩu", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page).toHaveURL(/\/account$/);
  await page.goto(`${base}/admin/rentals`);
  await page
    .getByRole("button", { name: `Chi tiết ${rental.rental_code}` })
    .click();
  await page.getByRole("button", { name: "Đã xác nhận", exact: true }).click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Xác nhận", exact: true })
    .click();
  await expect(
    page
      .getByRole("dialog")
      .locator(".badge")
      .filter({ hasText: "Đã xác nhận" }),
  ).toBeVisible();
  const [confirmed] = (
    await pool.query("select status from rentals where id=$1", [rental.id])
  ).rows;
  expect(confirmed.status).toBe("CONFIRMED");
  await page.getByRole("button", { name: "Đang thuê", exact: true }).click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Xác nhận", exact: true })
    .click();
  await expect(
    page.getByRole("dialog").locator(".badge").filter({ hasText: "Đang thuê" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Hoàn thành", exact: true }).click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Xác nhận", exact: true })
    .click();
  await expect(
    page
      .getByRole("dialog")
      .locator(".badge")
      .filter({ hasText: "Hoàn thành" }),
  ).toBeVisible();
  reports.push("Admin confirms, hands over and completes a real rental");
  await page.goto(`${base}/admin/categories`);
  await page
    .getByRole("button", { name: "Thêm danh mục", exact: true })
    .click();
  await page.getByLabel("Tên danh mục", { exact: true }).fill(prefix);
  await page.getByLabel("Slug", { exact: true }).fill(prefix.toLowerCase());
  await page.getByRole("button", { name: "Lưu thay đổi", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  const categoryRow = page.getByRole("row").filter({ hasText: prefix });
  await expect(categoryRow).toBeVisible();
  await categoryRow
    .getByRole("button", { name: "Chỉnh sửa", exact: true })
    .click();
  await page
    .getByLabel("Tên danh mục", { exact: true })
    .fill(`${prefix} edited`);
  await page.getByRole("button", { name: "Lưu thay đổi", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page
    .getByRole("row")
    .filter({ hasText: `${prefix} edited` })
    .getByRole("button", { name: "Xóa", exact: true })
    .click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Xác nhận", exact: true })
    .click();
  await expect(page.getByRole("row").filter({ hasText: prefix })).toHaveCount(
    0,
  );
  reports.push("Admin create, edit and confirmed delete persist");
  const invalid = await context.request.post(`${base}/api/upload`, {
    headers: { Origin: base },
    multipart: {
      file: {
        name: "bad.png",
        mimeType: "image/png",
        buffer: Buffer.from("<svg onload='alert(1)'/>fake"),
      },
    },
  });
  expect(invalid.status()).toBe(400);
  const csrf = await context.request.post(`${base}/api/upload`, {
    headers: { Origin: "https://untrusted.invalid" },
    multipart: {
      file: {
        name: "bad.png",
        mimeType: "image/png",
        buffer: Buffer.from("fake"),
      },
    },
  });
  expect(csrf.status()).toBe(403);
  reports.push("Uploads reject spoofed images and foreign origins");
  const widths = [320, 375, 390, 430, 768, 1024, 1440];
  const routes = [
    "/",
    "/cameras",
    "/cameras/sony-a7-iv",
    "/account",
    "/rentals",
    "/admin",
    "/admin/cameras",
    "/admin/prices",
    "/admin/rentals",
    "/admin/settings",
    "/admin/users",
  ];
  for (const route of routes) {
    await page.goto(`${base}${route}`);
    await expect(page.locator("h1").first()).toBeVisible();
    for (const width of widths) {
      await page.setViewportSize({ width, height: 900 });
      const size = await page.evaluate(() => ({
        width: document.documentElement.clientWidth,
        scroll: document.documentElement.scrollWidth,
      }));
      if (size.scroll > size.width + 1)
        throw new Error(
          `Horizontal overflow ${route} at ${width}: ${size.scroll}`,
        );
    }
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${base}/cameras`);
  await page.getByRole("button", { name: "Bộ lọc", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page
    .getByRole("dialog")
    .getByLabel("Thương hiệu", { exact: true })
    .selectOption("Fujifilm");
  await page.getByRole("button", { name: "Xem 1 thiết bị" }).click();
  await expect(page.locator(".camera-card")).toHaveCount(1);
  reports.push("Mobile bottom sheet filters work");
  await page.goto(`${base}/cameras/sony-a7-iv`);
  await page.screenshot({
    path: ".local/screenshots/detail-mobile.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(`${base}/admin`);
  await page.screenshot({
    path: ".local/screenshots/admin-desktop.png",
    fullPage: true,
  });
  reports.push(
    `No page overflow on ${routes.length} routes × ${widths.length} viewport widths`,
  );
  if (errors.length) throw new Error(errors.join("\n"));
  reports.push("No browser runtime errors");
  console.log(reports.join("\n"));
  await writeFile(
    ".local/e2e-result.json",
    JSON.stringify({ passed: true, reports }, null, 2),
  );
} catch (error) {
  await page.screenshot({
    path: ".local/screenshots/e2e-failure.png",
    fullPage: true,
  });
  console.error(error);
  process.exitCode = 1;
} finally {
  await browser.close();
  await pool.query(
    "delete from rentals where user_id in (select id from users where email=$1)",
    [customerEmail],
  );
  await pool.query("delete from users where email in ($1,$2)", [
    customerEmail,
    adminEmail,
  ]);
  await pool.query("delete from categories where slug=$1", [
    prefix.toLowerCase(),
  ]);
  await pool.end();
}
