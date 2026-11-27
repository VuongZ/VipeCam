"use server";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import {
  banners,
  cameras,
  cameraImages,
  categories,
  feedbacks,
  rentalPrices,
  rentalPolicies,
  settings,
} from "@/db/schema";
import {
  bannerSchema,
  cameraSchema,
  categorySchema,
  feedbackSchema,
  imageSchema,
  priceSchema,
  rentalPolicySchema,
  settingsSchema,
} from "@/validators";
import { changeRentalStatus, reservedQuantity } from "@/services/booking";
import { todayInVietnam } from "@/services/booking-rules";
import { ensurePrimaryImage, saveCameraImages } from "@/services/camera-images";
import { saveCameraRecipes } from "@/services/camera-recipes";
async function authorize() {
  const session = await getSession();
  if (session?.user.role !== "ADMIN")
    throw new Error("Bạn không có quyền thực hiện thao tác này.");
}
function message(error: unknown) {
  if (error instanceof z.ZodError)
    return error.issues[0]?.message || "Dữ liệu chưa hợp lệ.";
  if (error instanceof Error && !("query" in error) && !("code" in error))
    return error.message;
  return "Không thể lưu. Kiểm tra slug trùng, dữ liệu liên quan hoặc kết nối cơ sở dữ liệu.";
}
function invalidate() {
  revalidatePath("/", "layout");
}
export async function saveResource(
  resource: string,
  id: string | null,
  raw: unknown,
) {
  try {
    await authorize();
    if (id) z.uuid().parse(id);
    switch (resource) {
      case "cameras": {
        const { images, recipeImages, ...data } = cameraSchema.parse(raw);
        await db.transaction(async (tx) => {
          let cameraId = id;
          if (id) {
            await tx
              .select()
              .from(cameras)
              .where(eq(cameras.id, id))
              .for("update");
            const reserved = await reservedQuantity(
              tx,
              id,
              todayInVietnam(),
              "9999-12-31",
            );
            if (
              reserved > 0 &&
              (data.quantity < reserved ||
                !data.isActive ||
                ["MAINTENANCE", "INACTIVE"].includes(data.status))
            )
              throw new Error(
                "Thiết bị có đơn đã xác nhận. Xử lý các đơn trước khi giảm tồn kho hoặc ngừng cho thuê.",
              );
            await tx.update(cameras).set(data).where(eq(cameras.id, id));
          } else {
            const [created] = await tx
              .insert(cameras)
              .values(data)
              .returning({ id: cameras.id });
            cameraId = created.id;
          }
          if (images !== undefined && cameraId)
            await saveCameraImages(tx, cameraId, images);
          if (recipeImages !== undefined && cameraId)
            await saveCameraRecipes(tx, cameraId, recipeImages);
        });
        break;
      }
      case "categories": {
        const data = categorySchema.parse(raw);
        if (id)
          await db.update(categories).set(data).where(eq(categories.id, id));
        else await db.insert(categories).values(data);
        break;
      }
      case "prices": {
        const data = priceSchema.parse(raw);
        if (id)
          await db
            .update(rentalPrices)
            .set(data)
            .where(eq(rentalPrices.id, id));
        else await db.insert(rentalPrices).values(data);
        break;
      }
      case "images": {
        const data = imageSchema.parse(raw);
        await db.transaction(async (tx) => {
          if (id) {
            const [old] = await tx
              .select()
              .from(cameraImages)
              .where(eq(cameraImages.id, id));
            if (!old || old.cameraId !== data.cameraId)
              throw new Error(
                "Không chuyển ảnh sang thiết bị khác. Hãy thêm ảnh mới.",
              );
          }
          await tx
            .select()
            .from(cameras)
            .where(eq(cameras.id, data.cameraId))
            .for("update");
          if (data.isPrimary)
            await tx
              .update(cameraImages)
              .set({ isPrimary: false })
              .where(eq(cameraImages.cameraId, data.cameraId));
          if (id)
            await tx
              .update(cameraImages)
              .set(data)
              .where(eq(cameraImages.id, id));
          else await tx.insert(cameraImages).values(data);
          await ensurePrimaryImage(tx, data.cameraId);
        });
        break;
      }
      case "rental-policies": {
        const data = rentalPolicySchema.parse(raw);
        if (id)
          await db
            .update(rentalPolicies)
            .set(data)
            .where(eq(rentalPolicies.id, id));
        else await db.insert(rentalPolicies).values(data);
        break;
      }
      case "banners": {
        const data = bannerSchema.parse(raw);
        if (id) await db.update(banners).set(data).where(eq(banners.id, id));
        else await db.insert(banners).values(data);
        break;
      }
      case "feedbacks": {
        const data = feedbackSchema.parse(raw);
        if (id)
          await db.update(feedbacks).set(data).where(eq(feedbacks.id, id));
        else await db.insert(feedbacks).values(data);
        break;
      }
      default:
        throw new Error("Nội dung không hợp lệ.");
    }
    invalidate();
    return { success: true };
  } catch (error) {
    return { error: message(error) };
  }
}
export async function deleteResource(resource: string, id: string) {
  try {
    await authorize();
    z.uuid().parse(id);
    switch (resource) {
      case "cameras":
        await db.delete(cameras).where(eq(cameras.id, id));
        break;
      case "categories":
        await db.delete(categories).where(eq(categories.id, id));
        break;
      case "prices":
        await db.delete(rentalPrices).where(eq(rentalPrices.id, id));
        break;
      case "images":
        await db.transaction(async (tx) => {
          const [image] = await tx
            .select()
            .from(cameraImages)
            .where(eq(cameraImages.id, id));
          if (!image) return;
          await tx
            .select({ id: cameras.id })
            .from(cameras)
            .where(eq(cameras.id, image.cameraId))
            .for("update");
          await tx.delete(cameraImages).where(eq(cameraImages.id, id));
          await ensurePrimaryImage(tx, image.cameraId);
        });
        break;
      case "rental-policies":
        await db.delete(rentalPolicies).where(eq(rentalPolicies.id, id));
        break;
      case "banners":
        await db.delete(banners).where(eq(banners.id, id));
        break;
      case "feedbacks":
        await db.delete(feedbacks).where(eq(feedbacks.id, id));
        break;
      default:
        throw new Error("Nội dung không hợp lệ.");
    }
    invalidate();
    return { success: true };
  } catch (error) {
    return { error: message(error) };
  }
}
export async function saveSettings(raw: unknown) {
  try {
    await authorize();
    const data = settingsSchema.parse(raw);
    await db
      .insert(settings)
      .values({ id: "shop", ...data })
      .onConflictDoUpdate({ target: settings.id, set: data });
    invalidate();
    return { success: true };
  } catch (error) {
    return { error: message(error) };
  }
}
export async function updateRentalStatus(id: string, status: string) {
  try {
    await authorize();
    z.uuid().parse(id);
    const next = z
      .enum(["PENDING", "CONFIRMED", "RENTING", "COMPLETED", "CANCELLED"])
      .parse(status);
    await changeRentalStatus(id, next);
    invalidate();
    return { success: true };
  } catch (error) {
    return { error: message(error) };
  }
}
