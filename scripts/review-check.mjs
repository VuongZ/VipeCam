import { chromium, expect } from "@playwright/test";
import { Pool } from "pg";
import { hashPassword } from "better-auth/crypto";
import { randomUUID, randomBytes } from "node:crypto";
import { mkdir, readFile } from "node:fs/promises";
import { testDatabaseUrl } from "./test-environment.mjs";

const base = process.env.TEST_BASE_URL || "http://localhost:3001";
const databaseUrl = testDatabaseUrl;
if (
  ![base, databaseUrl].every((value) =>
    ["localhost", "127.0.0.1"].includes(new URL(value).hostname),
  )
)
  throw new Error("Use local test services only.");
const pool = new Pool({ connectionString: databaseUrl });
const browser = await chromium.launch({ channel: "msedge", headless: true });
const context = await browser.newContext({
  viewport: { width: 320, height: 740 },
  serviceWorkers: "block",
});
const page = await context.newPage();
const failures = [];
page.on("pageerror", (error) => failures.push(error.message));
const id = randomUUID(),
  slug = `review-${id}`,
  email = `${slug}@example.invalid`,
  password = randomBytes(24).toString("base64url");
let cameraId;
try {
  await mkdir(".local/screenshots", { recursive: true });
  await pool.query(
    "insert into users(id,name,email,role) values($1,$2,$3,'ADMIN')",
    [id, "Review".repeat(40), email],
  );
  await pool.query(
    "insert into auth_accounts(id,account_id,provider_id,user_id,password) values($1,$2,'credential',$2,$3)",
    [randomUUID(), id, await hashPassword(password)],
  );
  cameraId = (
    await pool.query(
      "insert into cameras(name,slug,brand,model,description,short_description,category_id,quantity,deposit) select $1,$2,'Review','Review','Review','Review',id,2,100000 from categories where is_active limit 1 returning id",
      ["Review camera", slug],
    )
  ).rows[0].id;
  await pool.query(
    "insert into rental_prices(camera_id,name,duration_days,price) values($1,'1 ngày',1,100000),($1,'2 ngày',2,180000)",
    [cameraId],
  );
  await pool.query(
    "insert into camera_images(camera_id,image_url,display_order) select $1,'/missing-review-' || n || '.png',n from generate_series(1,10) n",
    [cameraId],
  );
  const signIn = await context.request.post(`${base}/api/auth/sign-in/email`, {
    headers: { Origin: base },
    data: { email, password },
  });
  expect(signIn.ok()).toBe(true);
  await page.route("**/api/availability?**", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ error: "Chưa kiểm tra được lịch thuê." }),
    }),
  );
  await page.goto(`${base}/cameras/${slug}`);
  const booking = page
    .locator("#booking")
    .getByRole("button", { name: "Đặt thuê", exact: true });
  await expect(
    page.getByRole("button", { name: "Kiểm tra lại lịch trống" }),
  ).toBeVisible();
  await expect(booking).toBeDisabled();
  await expect(page.locator(".gallery-main")).toHaveAttribute(
    "src",
    "/images/camera-placeholder.webp",
  );
  await page.unroute("**/api/availability?**");
  await page.getByRole("button", { name: "Kiểm tra lại lịch trống" }).click();
  await expect(booking).toBeEnabled();
  await page.route("**/api/availability?**", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 700));
    await route.continue();
  });
  await page.getByLabel("Ngày nhận", { exact: true }).fill("2031-01-01");
  await expect(booking).toBeDisabled();
  await expect(booking).toBeEnabled();
  await page.getByLabel("Ngày trả", { exact: true }).fill("2031-01-03");
  await expect(booking).toBeDisabled();
  await expect(page.locator("#booking").getByRole("alert")).toContainText(
    "khớp",
  );
  await page.getByLabel("Ngày trả", { exact: true }).fill("2031-01-01");
  await expect(booking).toBeEnabled();
  await page.route("**/*", (route) =>
    route.request().method() === "POST"
      ? route.abort("failed")
      : route.continue(),
  );
  await booking.click();
  await expect(page.locator("#booking [role=alert]")).toContainText(
    "Không thể kết nối",
  );
  await page.unroute("**/*");
  const nav = await page.locator(".bottom-nav").boundingBox();
  const bar = await page.locator(".mobile-booking").boundingBox();
  expect(bar.y + bar.height).toBeLessThanOrEqual(nav.y + 1);
  expect(
    await page
      .locator(".gallery-thumbs button")
      .first()
      .evaluate((el) => el.getBoundingClientRect().width),
  ).toBeGreaterThanOrEqual(44);
  await page.screenshot({
    path: ".local/screenshots/review-detail-320.png",
    fullPage: true,
  });
  console.log(
    "Availability failure/retry, stale dates, invalid duration, booking network error, broken images and mobile controls passed",
  );

  await page
    .locator(".bottom-nav")
    .getByRole("link", { name: "Tài khoản" })
    .click();
  await expect(page).toHaveURL(/\/account$/);
  await page
    .getByLabel("Mật khẩu hiện tại", { exact: true })
    .fill("wrong-password");
  await page.getByLabel("Mật khẩu mới", { exact: true }).fill(password + "new");
  await page.getByRole("button", { name: "Cập nhật mật khẩu" }).click();
  await expect(
    page.getByText("Không thể cập nhật. Kiểm tra thông tin và thử lại.", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByLabel("Mật khẩu hiện tại", { exact: true }),
  ).toHaveValue("wrong-password");
  await expect(page.getByLabel("Mật khẩu mới", { exact: true })).toHaveValue(
    password + "new",
  );
  await pool.query("update users set role='CUSTOMER' where id=$1", [id]);
  await page.goto(`${base}/admin`);
  await expect(page).toHaveURL(/\/account$/);
  expect(
    (
      await context.request.post(`${base}/api/upload`, {
        headers: { Origin: base },
        data: "denied",
      })
    ).status(),
  ).toBe(403);
  console.log(
    "Password failure preserves input; revoked admin privileges apply to an existing session",
  );
  const manifest = JSON.parse(
    await readFile(".next/server/server-reference-manifest.json", "utf8"),
  );
  for (const [name, path, args] of [
    ["saveResource", "/admin/categories", ["categories", null, {}]],
    ["deleteResource", "/admin/cameras", ["cameras", randomUUID()]],
    ["saveSettings", "/admin/settings", [{}]],
    ["updateRentalStatus", "/admin/rentals", [randomUUID(), "CONFIRMED"]],
  ]) {
    const [actionId] = Object.entries(manifest.node).find(
      ([, action]) => action.exportedName === name,
    );
    const denied = await context.request.post(base + path, {
      headers: {
        Origin: base,
        "Next-Action": actionId,
        "Content-Type": "text/plain;charset=UTF-8",
      },
      data: JSON.stringify(args),
    });
    expect(await denied.text(), name).toContain(
      "Bạn không có quyền thực hiện thao tác này.",
    );
  }
  console.log(
    "Direct calls to all four admin actions reject a customer session",
  );

  for (const path of [
    "/",
    "/login",
    "/register",
    "/about",
    "/policies",
    "/cameras",
    `/cameras/${slug}`,
    "/account",
    "/rentals",
    "/missing-review-page",
  ]) {
    await page.goto(base + path);
    await expect(page.locator("h1").first()).toBeVisible();
    for (const width of [320, 360, 375, 390, 430, 768, 1024, 1440, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
        `${path} at ${width}`,
      ).toBeLessThanOrEqual(width + 1);
    }
  }
  await page.goto(`${base}/cameras?q=does-not-exist-review`);
  await expect(
    page.getByRole("heading", { name: "Chưa tìm thấy thiết bị" }),
  ).toBeVisible();
  await page.goto(base);
  await expect(page.locator(".hero")).toBeVisible();
  await page.waitForLoadState("networkidle");
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.setViewportSize({ width: 320, height: 740 });
  await page.screenshot({
    path: ".local/screenshots/review-home-320.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({
    path: ".local/screenshots/review-home-1440.png",
    fullPage: true,
  });
  expect(failures).toEqual([]);
  console.log(
    "Empty states, 404 and 10 routes at 9 widths (320–1920px) passed with no browser runtime errors",
  );
} finally {
  await browser.close();
  await pool.query("delete from rentals where user_id=$1", [id]);
  if (cameraId) await pool.query("delete from cameras where id=$1", [cameraId]);
  await pool.query("delete from users where id=$1", [id]);
  await pool.end();
}
