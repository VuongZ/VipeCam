import { chromium, expect } from "@playwright/test";
import { Pool } from "pg";
import { hashPassword } from "better-auth/crypto";
import { randomUUID, randomBytes } from "node:crypto";
import { testDatabaseUrl } from "./test-environment.mjs";
const base = process.env.TEST_BASE_URL || "http://localhost:3000";
const databaseUrl = testDatabaseUrl;
if (
  !["localhost", "127.0.0.1"].includes(new URL(base).hostname) ||
  !["localhost", "127.0.0.1"].includes(new URL(databaseUrl).hostname)
)
  throw new Error("Use local services only.");
const pool = new Pool({ connectionString: databaseUrl });
const browser = await chromium.launch({ channel: "msedge", headless: true });
const context = await browser.newContext();
const page = await context.newPage();
const tag = `QA-${randomUUID().slice(0, 8)}`,
  id = randomUUID(),
  email = `${tag.toLowerCase()}@example.invalid`,
  password = randomBytes(24).toString("base64url");
const original = (
  await pool.query("select footer_text from settings where id='shop'")
).rows[0].footer_text;
try {
  await pool.query(
    "insert into users(id,name,email,role) values($1,$2,$3,$4)",
    [id, tag, email, "ADMIN"],
  );
  await pool.query(
    "insert into auth_accounts(id,account_id,provider_id,user_id,password) values($1,$2,$3,$4,$5)",
    [randomUUID(), id, "credential", id, await hashPassword(password)],
  );
  await page.goto(`${base}/login`);
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Mật khẩu", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page).toHaveURL(/\/account$/);
  await page.goto(`${base}/admin/cameras`);
  await page
    .getByRole("button", { name: "Thêm thiết bị", exact: true })
    .click();
  const cameraFields = {
    "Tên thiết bị": tag,
    Slug: tag.toLowerCase(),
    "Thương hiệu": "QA",
    Model: "QA",
    "Mô tả ngắn": "Máy kiểm thử",
    "Mô tả chi tiết": "Thiết bị kiểm thử tự động",
    "Thông số kỹ thuật": "Cảm biến: Kiểm thử",
    "Tiền cọc (đ)": "100000",
    "Số lượng thiết bị": "1",
  };
  for (const [label, value] of Object.entries(cameraFields))
    await page.getByLabel(label, { exact: true }).fill(value);
  await page
    .getByRole("dialog")
    .getByLabel("Danh mục", { exact: true })
    .selectOption({ index: 1 });
  await page.getByRole("button", { name: "Lưu thay đổi", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  const cameraId = (
    await pool.query("select id from cameras where slug=$1", [
      tag.toLowerCase(),
    ])
  ).rows[0].id;
  const scenarios = [
    {
      resource: "banners",
      add: "Thêm banner",
      fields: {
        "Tiêu đề": tag,
        "Nội dung phụ": "Nội dung thử nghiệm",
        "Ảnh banner": "/images/camera-placeholder.webp",
        "Chữ trên nút": "Xem thiết bị",
        "Liên kết": "/cameras",
      },
      edit: "Tiêu đề",
    },
    {
      resource: "feedbacks",
      add: "Thêm đánh giá",
      fields: { "Tên khách hàng": tag, "Nội dung": "Đánh giá thử nghiệm" },
      edit: "Tên khách hàng",
    },
    {
      resource: "prices",
      add: "Thêm mức giá",
      fields: {
        "Tên gói": tag,
        "Số ngày thuê": "1",
        "Giá cả gói (đ)": "45000",
      },
      camera: true,
      edit: "Tên gói",
    },
  ];
  for (const s of scenarios) {
    await page.goto(`${base}/admin/${s.resource}`);
    await page.getByRole("button", { name: s.add, exact: true }).click();
    if (s.camera)
      await page
        .getByRole("dialog")
        .getByLabel("Thiết bị", { exact: true })
        .selectOption(cameraId);
    for (const [label, value] of Object.entries(s.fields))
      await page.getByLabel(label, { exact: true }).fill(value);
    await page
      .getByRole("button", { name: "Lưu thay đổi", exact: true })
      .click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    let row = page.getByRole("row").filter({ hasText: tag });
    await expect(row).toBeVisible();
    await row.getByRole("button", { name: "Chỉnh sửa", exact: true }).click();
    await page.getByLabel(s.edit, { exact: true }).fill(`${tag} changed`);
    await page
      .getByRole("button", { name: "Lưu thay đổi", exact: true })
      .click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    row = page.getByRole("row").filter({ hasText: `${tag} changed` });
    await row.getByRole("button", { name: "Xóa", exact: true }).click();
    await page
      .getByRole("alertdialog")
      .getByRole("button", { name: "Xác nhận", exact: true })
      .click();
    await expect(page.getByRole("row").filter({ hasText: tag })).toHaveCount(0);
    console.log(`${s.resource}: create/edit/delete passed`);
  }
  await page.goto(`${base}/admin/images?camera=${cameraId}`);
  await page.getByRole("button", { name: "Thêm ảnh", exact: true }).click();
  await page
    .getByLabel("Tải ảnh thiết bị", { exact: true })
    .setInputFiles("public/icons/icon-192.png");
  await expect(page.getByLabel("Ảnh thiết bị", { exact: true })).toHaveValue(
    /^\/uploads\//,
  );
  await page.getByLabel("Dùng làm ảnh chính", { exact: true }).check();
  await page.getByRole("button", { name: "Lưu thay đổi", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  const imageRow = (
    await pool.query("select * from camera_images where camera_id=$1", [
      cameraId,
    ])
  ).rows[0];
  expect(imageRow.is_primary).toBe(true);
  expect(
    (await context.request.get(`${base}${imageRow.image_url}`)).status(),
  ).toBe(200);
  console.log(
    "images: validated upload, saved image and primary selection passed",
  );
  await page.goto(`${base}/admin/settings`);
  await page.waitForLoadState("networkidle");
  await page.getByLabel("Nội dung chân trang", { exact: true }).fill(tag);
  await page.getByRole("button", { name: "Lưu thay đổi", exact: true }).click();
  await expect
    .poll(
      async () =>
        (await pool.query("select footer_text from settings where id='shop'"))
          .rows[0].footer_text,
    )
    .toBe(tag);
  await page.goto(base);
  await expect(
    page.locator("footer").getByText(tag, { exact: true }),
  ).toBeVisible();
  console.log("settings: database save reflected on public homepage");
  await page.goto(`${base}/admin/cameras`);
  const row = page.getByRole("row").filter({ hasText: tag });
  await row.getByRole("button", { name: "Chỉnh sửa", exact: true }).click();
  await page.getByLabel("Hiển thị / hoạt động", { exact: true }).uncheck();
  await page.getByRole("button", { name: "Lưu thay đổi", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.goto(`${base}/cameras/${tag.toLowerCase()}`);
  await expect(
    page.getByRole("heading", { name: "Không tìm thấy trang", exact: true }),
  ).toBeVisible();
  expect(
    (await pool.query("select is_active from cameras where id=$1", [cameraId]))
      .rows[0].is_active,
  ).toBe(false);
  console.log("cameras: CRUD, specifications and public visibility passed");
  const spoof = await context.request.post(`${base}/api/auth/sign-up/email`, {
    headers: { Origin: base },
    data: {
      name: tag,
      email: `role-${email}`,
      password,
      phone: "0901234567",
      role: "ADMIN",
    },
  });
  expect(spoof.ok()).toBe(true);
  expect(
    (
      await pool.query("select role from users where email=$1", [
        `role-${email}`,
      ])
    ).rows[0].role,
  ).toBe("CUSTOMER");
  console.log("auth: role injection rejected");
} catch (error) {
  await page.screenshot({
    path: ".local/screenshots/admin-check-failure.png",
    fullPage: true,
  });
  console.error(error);
  process.exitCode = 1;
} finally {
  await browser.close();
  await pool.query("update settings set footer_text=$1 where id='shop'", [
    original,
  ]);
  await pool.query("delete from banners where title like $1", [`${tag}%`]);
  await pool.query("delete from feedbacks where customer_name like $1", [
    `${tag}%`,
  ]);
  await pool.query("delete from cameras where slug=$1", [tag.toLowerCase()]);
  await pool.query("delete from users where email in ($1,$2)", [
    email,
    `role-${email}`,
  ]);
  await pool.end();
}
