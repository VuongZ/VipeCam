import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
const browser = await chromium.launch({ channel: "msedge", headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
await page.goto("http://localhost:3000", { waitUntil: "networkidle" });
await mkdir(".local/screenshots", { recursive: true });
await page.screenshot({
  path: ".local/screenshots/home-desktop.png",
  fullPage: true,
});
await page.setViewportSize({ width: 390, height: 844 });
await page.screenshot({
  path: ".local/screenshots/home-mobile.png",
  fullPage: true,
});
console.log(await page.title());
console.log(
  "Document width:",
  await page.evaluate(() => document.documentElement.scrollWidth),
);
await browser.close();
