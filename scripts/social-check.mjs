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
const original = (
  await pool.query(
    "select facebook_url, tiktok_url from settings where id='shop'",
  )
).rows[0];
const browser = await chromium.launch({ channel: "msedge", headless: true });
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  serviceWorkers: "block",
});
const page = await context.newPage();
const id = randomUUID(),
  email = `social-${id}@example.invalid`,
  password = randomBytes(24).toString("base64url");
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
// Test destinations only; store links are always configured through Settings.
const facebook = "https://www.facebook.com/social-test",
  tiktok = "https://www.tiktok.com/@social-test";
async function save(fb, tk) {
  await page.goto(`${base}/admin/settings`);
  await page.getByLabel("Liên kết Facebook", { exact: true }).fill(fb);
  await page.getByLabel("Liên kết TikTok", { exact: true }).fill(tk);
  await page.getByRole("button", { name: "Lưu thay đổi", exact: true }).click();
  await expect(
    page.getByText("Đã cập nhật cài đặt.", { exact: true }),
  ).toBeVisible();
  expect(
    (
      await pool.query(
        "select facebook_url, tiktok_url from settings where id='shop'",
      )
    ).rows[0],
  ).toEqual({ facebook_url: fb.trim(), tiktok_url: tk.trim() });
}
try {
  await mkdir(".local/screenshots", { recursive: true });
  await pool.query(
    "insert into users(id,name,email,role) values($1,'Social Test',$2,'ADMIN')",
    [id, email],
  );
  await pool.query(
    "insert into auth_accounts(id,account_id,provider_id,user_id,password) values($1,$2,'credential',$2,$3)",
    [randomUUID(), id, await hashPassword(password)],
  );
  expect(
    (
      await context.request.post(`${base}/api/auth/sign-in/email`, {
        headers: { Origin: base },
        data: { email, password },
      })
    ).ok(),
  ).toBe(true);
  await save(` ${facebook} `, tiktok);
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of ["/", "/contact", "/about"]) {
      await page.goto(`${base}${route}`);
      await expect(page.locator(".site-footer")).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      for (const [label, url] of [
        ["Facebook", facebook],
        ["TikTok", tiktok],
      ]) {
        const links = page.locator(
          `a[aria-label="${label} của VipeCam"]:visible`,
        );
        expect(await links.count()).toBeGreaterThan(0);
        for (const link of await links.all()) {
          await expect(link).toHaveAttribute("href", url);
          await expect(link).toHaveAttribute("target", "_blank");
          await expect(link).toHaveAttribute("rel", "noopener noreferrer");
          const box = await link.boundingBox();
          expect(box.width).toBeGreaterThanOrEqual(44);
          expect(box.height).toBeGreaterThanOrEqual(44);
        }
      }
    }
    await page.screenshot({
      path: `.local/screenshots/social-${width}.png`,
      fullPage: true,
    });
  }
  // Intercept external destinations: verify actual clicks open the configured URL without contacting the platforms.
  await context.route(/https:\/\/www\.(facebook|tiktok)\.com\/.*/, (route) =>
    route.fulfill({ body: "Test destination" }),
  );
  for (const [label, url] of [
    ["Facebook", facebook],
    ["TikTok", tiktok],
  ]) {
    const popupPromise = context.waitForEvent("page");
    await page
      .locator(`a[aria-label="${label} của VipeCam"]:visible`)
      .first()
      .click();
    const popup = await popupPromise;
    await popup.waitForLoadState();
    expect(popup.url()).toBe(url);
    expect(await popup.evaluate(() => window.opener === null)).toBe(true);
    await popup.close();
  }
  for (const [fb, tk] of [
    ["", tiktok],
    [facebook, ""],
    ["", ""],
  ]) {
    await save(fb, tk);
    for (const route of ["/", "/about", "/contact"]) {
      await page.goto(`${base}${route}`);
      await expect(page.locator(".site-footer")).toBeVisible();
      for (const [label, url] of [
        ["Facebook", fb],
        ["TikTok", tk],
      ]) {
        const count = await page
          .locator(`a[aria-label="${label} của VipeCam"]`)
          .count();
        expect(url ? count > 0 : count === 0).toBe(true);
      }
      if (!fb && !tk)
        await expect(
          page.getByText("Theo dõi VipeCam", { exact: true }),
        ).toHaveCount(0);
    }
  }
  expect(errors).toEqual([]);
  console.log(
    "PASS: Admin persistence, trimming, both links, new tabs/no opener, independent empty states, 320/390/768/1440px layouts and 44px targets.",
  );
} finally {
  await browser.close();
  await pool.query(
    "update settings set facebook_url=$1,tiktok_url=$2 where id='shop'",
    [original.facebook_url, original.tiktok_url],
  );
  await pool.query("delete from users where id=$1", [id]);
  await pool.end();
}
