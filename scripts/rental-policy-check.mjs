import { chromium, expect } from "@playwright/test";
import { Pool } from "pg";
import { hashPassword } from "better-auth/crypto";
import { randomUUID, randomBytes } from "node:crypto";
import { mkdir } from "node:fs/promises";
import { testDatabaseUrl } from "./test-environment.mjs";
const base = "http://localhost:3006";
const pool = new Pool({ connectionString: testDatabaseUrl });
const browser = await chromium.launch({ channel: "msedge", headless: true });
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  serviceWorkers: "block",
});
const page = await context.newPage();
const id = randomUUID(),
  title = `Policy-${id}`,
  email = `${id}@example.invalid`,
  password = randomBytes(24).toString("base64url");
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const save = async () => {
  await page.getByRole("button", { name: "Lưu thay đổi", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
};
const row = () => page.getByRole("row").filter({ hasText: title });
const edit = async () => {
  await page.goto(`${base}/admin/rental-policies`);
  await row().getByRole("button", { name: "Chỉnh sửa", exact: true }).click();
};
try {
  await mkdir(".local/screenshots", { recursive: true });
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`${base}/quy-dinh-thue`);
    await expect(page.locator(".rental-policy-card")).toHaveCount(4);
    for (let i = 0; i < 4; i++) {
      const img = page.locator(".rental-policy-card img").nth(i);
      await img.scrollIntoViewIfNeeded();
      await expect(img).toHaveAttribute(
        "src",
        `/images/rental-policies/policy-${i + 1}.jpg`,
      );
      await expect
        .poll(() => img.evaluate((el) => el.complete && el.naturalWidth > 0))
        .toBe(true);
      expect(await img.evaluate((el) => getComputedStyle(el).objectFit)).toBe(
        "contain",
      );
      const ratio = await img.evaluate(
        (el) => el.clientWidth / el.clientHeight,
      );
      expect(Math.abs(ratio - 0.8)).toBeLessThan(0.01);
    }
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.locator(".rental-policy-card").first().click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.getByRole("button", { name: "Đóng ảnh quy định" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    if (width === 390)
      await page.screenshot({
        path: ".local/screenshots/rental-policy-mobile.png",
        fullPage: true,
      });
  }
  await page.goto(`${base}/policies`);
  await expect(page).toHaveURL(`${base}/quy-dinh-thue`);
  await page.goto(`${base}/admin/rental-policies`);
  await expect(page).toHaveURL(/login/);
  await pool.query(
    "insert into users(id,name,email,role) values($1,'Policy Test',$2,'ADMIN')",
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
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${base}/admin/rental-policies`);
  await page
    .getByRole("button", { name: "Thêm ảnh quy định", exact: true })
    .click();
  await page.getByLabel("Tiêu đề", { exact: true }).fill(title);
  await page
    .getByLabel("Tải ảnh quy định", { exact: true })
    .setInputFiles("public/images/rental-policies/policy-1.jpg");
  await expect(page.getByLabel("Ảnh quy định", { exact: true })).toHaveValue(
    /^\/uploads\//,
  );
  await page.getByLabel("Thứ tự hiển thị", { exact: true }).fill("99");
  await save();
  const created = (
    await pool.query("select * from rental_policies where title=$1", [title])
  ).rows[0];
  expect(created.is_active).toBe(true);
  await edit();
  await page
    .getByLabel("Tải ảnh quy định", { exact: true })
    .setInputFiles("public/images/rental-policies/policy-2.jpg");
  await expect(
    page.getByLabel("Ảnh quy định", { exact: true }),
  ).not.toHaveValue(created.image_url);
  await page.getByLabel("Thứ tự hiển thị", { exact: true }).fill("0");
  await page.getByLabel("Hiển thị / hoạt động", { exact: true }).uncheck();
  await save();
  const updated = (
    await pool.query("select * from rental_policies where id=$1", [created.id])
  ).rows[0];
  expect(updated.display_order).toBe(0);
  expect(updated.is_active).toBe(false);
  expect(updated.updated_at > created.updated_at).toBe(true);
  await page.goto(`${base}/quy-dinh-thue`);
  await expect(page.locator(".rental-policy-card")).toHaveCount(4);
  await edit();
  await page.getByLabel("Hiển thị / hoạt động", { exact: true }).check();
  await page.getByLabel("Thứ tự hiển thị", { exact: true }).fill("99");
  await save();
  await page.goto(`${base}/quy-dinh-thue`);
  await expect(page.locator(".rental-policy-card")).toHaveCount(5);
  await expect(page.locator(".rental-policy-card").last()).toHaveAttribute(
    "aria-label",
    `Xem lớn ${title}`,
  );
  await page.goto(`${base}/admin/rental-policies`);
  await row().getByRole("button", { name: "Xóa", exact: true }).click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Xác nhận", exact: true })
    .click();
  await expect(row()).toHaveCount(0);
  expect(
    (
      await pool.query("select id from rental_policies where id=$1", [
        created.id,
      ])
    ).rows,
  ).toHaveLength(0);
  await page.goto(`${base}/quy-dinh-thue`);
  await expect(page.locator(".rental-policy-card")).toHaveCount(4);
  expect(errors).toEqual([]);
  console.log(
    "PASS: mobile 320/390/768/1440, image order/ratio/loading, modal, redirect, admin auth, upload/create/replace/order/hide/show/delete, database timestamps.",
  );
} finally {
  await pool.query("delete from rental_policies where title=$1", [title]);
  await pool.query("delete from users where id=$1", [id]);
  await browser.close();
  await pool.end();
}
