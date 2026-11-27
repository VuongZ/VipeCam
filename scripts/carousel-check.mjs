import { chromium, expect } from "@playwright/test";
import { Pool } from "pg";
import { randomUUID } from "node:crypto";
import { testDatabaseUrl } from "./test-environment.mjs";
const pool = new Pool({ connectionString: testDatabaseUrl });
const browser = await chromium.launch({ channel: "msedge", headless: true });
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
  serviceWorkers: "block",
});
const page = await context.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const camera = (
  await pool.query(
    "select * from cameras where is_active=true order by name limit 1",
  )
).rows[0];
const imageId = randomUUID(),
  bannerId = randomUUID();
async function tap(locator) {
  await locator.scrollIntoViewIfNeeded();
  const b = await locator.boundingBox();
  const c = await context.newCDPSession(page);
  await c.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: b.x + b.width / 2, y: b.y + b.height / 2 }],
  });
  await new Promise((r) => setTimeout(r, 80));
  await c.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await c.detach();
}
async function swipe(locator, dx, dy = 0) {
  const cdp = await context.newCDPSession(page);
  await locator.scrollIntoViewIfNeeded();
  const box = await locator.boundingBox();
  const x = box.x + box.width / 2,
    y = Math.max(100, Math.min(600, box.y + box.height / 2));
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x, y }],
  });
  for (let i = 1; i <= 8; i++) {
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x: x + (dx * i) / 8, y: y + (dy * i) / 8 }],
    });
    await new Promise((r) => setTimeout(r, 50));
  }
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await page.waitForTimeout(350);
  await cdp.detach();
}
try {
  await pool.query(
    "insert into camera_images(id,camera_id,image_url,display_order,is_primary) values($1,$2,$3,999,false)",
    [imageId, camera.id, "/images/rental-policies/policy-1.jpg"],
  );
  await pool.query(
    "insert into banners(id,title,subtitle,image_url,button_text,link_url,display_order,is_active) values($1,'Swipe test','Swipe test','/images/rental-policies/policy-2.jpg','Xem máy','/cameras',999,true)",
    [bannerId],
  );
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("http://localhost:3006");
    const dots = page.locator(".hero-dots button");
    await tap(
      page.getByRole("button", { name: "Banner tiếp theo", exact: true }),
    );
    await expect(dots.nth(1)).toHaveAttribute("aria-current", "true");
    await tap(page.getByRole("button", { name: "Banner trước", exact: true }));
    await expect(dots.first()).toHaveAttribute("aria-current", "true");
    await swipe(page.locator(".hero"), -90);
    await expect(dots.nth(1)).toHaveAttribute("aria-current", "true");
    await swipe(page.locator(".hero"), 90);
    await expect(dots.first()).toHaveAttribute("aria-current", "true");
    await tap(
      page.getByRole("button", { name: "Banner tiếp theo", exact: true }),
    );
    await expect(dots.nth(1)).toHaveAttribute("aria-current", "true");
    await tap(page.getByRole("button", { name: "Banner trước", exact: true }));
    await expect(dots.first()).toHaveAttribute("aria-current", "true");
    await tap(dots.last());
    await expect(dots.last()).toHaveAttribute("aria-current", "true");
    await page.goto(
      `http://localhost:3006/cameras?q=${encodeURIComponent(camera.name)}`,
    );
    const card = page
      .locator(".camera-card")
      .filter({ hasText: camera.name })
      .first();
    const img = card.locator(".camera-photo img");
    const before = await img.getAttribute("src");
    await swipe(card.locator(".camera-photo"), -80);
    await expect(img).not.toHaveAttribute("src", before);
    await expect(page).toHaveURL(/\/cameras\?q=/);
    await tap(
      card.getByRole("button", {
        name: `Ảnh trước của ${camera.name}`,
        exact: true,
      }),
    );
    await expect(img).toHaveAttribute("src", before);
    await tap(
      card.getByRole("button", {
        name: `Ảnh tiếp theo của ${camera.name}`,
        exact: true,
      }),
    );
    await expect(img).not.toHaveAttribute("src", before);
    await tap(card.locator(".camera-photo"));
    await expect(page).toHaveURL(
      `http://localhost:3006/cameras/${camera.slug}`,
    );
    const main = page.locator(".gallery-main");
    const first = await main.getAttribute("src");
    await swipe(page.locator(".gallery-stage"), -80);
    await expect(main).not.toHaveAttribute("src", first);
    await swipe(page.locator(".gallery-stage"), 80);
    await expect(main).toHaveAttribute("src", first);
    await tap(page.getByRole("button", { name: "Ảnh tiếp theo", exact: true }));
    await expect(main).not.toHaveAttribute("src", first);
    await tap(page.getByRole("button", { name: "Ảnh trước", exact: true }));
    await expect(main).toHaveAttribute("src", first);
    await tap(page.getByRole("button", { name: "Xem ảnh 2", exact: true }));
    await expect(
      page.getByRole("button", { name: "Xem ảnh 2", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    const current = await main.getAttribute("src");
    await swipe(page.locator(".gallery-stage"), 0, -100);
    await expect(main).toHaveAttribute("src", current);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  expect(errors).toEqual([]);
  console.log(
    "PASS: real touch swipe, arrows and dots for banners; product card swipe without navigation, arrows and tap navigation; detail swipe, arrows, thumbnails, vertical scroll; mobile 320/390.",
  );
} finally {
  await pool.query("delete from camera_images where id=$1", [imageId]);
  await pool.query("delete from banners where id=$1", [bannerId]);
  await browser.close();
  await pool.end();
}
