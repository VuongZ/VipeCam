import { eq } from "drizzle-orm";
import { db } from "@/db";
import { cameraImages, cameras } from "@/db/schema";
import { cameraImagesSchema, type CameraImageInput } from "@/validators";

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function ensurePrimaryImage(tx: Transaction, cameraId: string) {
  const images = await tx
    .select()
    .from(cameraImages)
    .where(eq(cameraImages.cameraId, cameraId))
    .orderBy(cameraImages.displayOrder, cameraImages.id);
  if (images.length && !images.some((image) => image.isPrimary)) {
    await tx
      .update(cameraImages)
      .set({ isPrimary: true })
      .where(eq(cameraImages.id, images[0].id));
  }
}

// Caller must be an authorized admin. Parent row locking serializes all image edits.
export async function saveCameraImages(
  tx: Transaction,
  cameraId: string,
  raw: CameraImageInput[],
) {
  const images = cameraImagesSchema.parse(raw);
  const [camera] = await tx
    .select({ id: cameras.id })
    .from(cameras)
    .where(eq(cameras.id, cameraId))
    .for("update");
  if (!camera) throw new Error("Thiết bị không còn tồn tại.");
  const existing = await tx
    .select()
    .from(cameraImages)
    .where(eq(cameraImages.cameraId, cameraId));
  const existingIds = new Set(existing.map((image) => image.id));
  if (images.some((image) => image.id && !existingIds.has(image.id)))
    throw new Error(
      "Ảnh không thuộc thiết bị này hoặc đã bị xóa. Vui lòng tải lại danh sách.",
    );
  const retained = new Set(images.map((image) => image.id));
  for (const image of existing) {
    if (!retained.has(image.id))
      await tx.delete(cameraImages).where(eq(cameraImages.id, image.id));
  }
  await tx
    .update(cameraImages)
    .set({ isPrimary: false })
    .where(eq(cameraImages.cameraId, cameraId));
  for (const [displayOrder, image] of images.entries()) {
    const data = {
      cameraId,
      imageUrl: image.imageUrl,
      isPrimary: image.isPrimary,
      displayOrder,
    };
    if (image.id)
      await tx
        .update(cameraImages)
        .set(data)
        .where(eq(cameraImages.id, image.id));
    else await tx.insert(cameraImages).values(data);
  }
}
