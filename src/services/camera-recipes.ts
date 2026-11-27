import { eq } from "drizzle-orm";
import type { z } from "zod";
import { db } from "@/db";
import { cameras, cameraRecipes } from "@/db/schema";
import { cameraRecipesSchema } from "@/validators";
type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function saveCameraRecipes(
  tx: Transaction,
  cameraId: string,
  raw: z.infer<typeof cameraRecipesSchema>,
) {
  const images = cameraRecipesSchema.parse(raw);
  const [camera] = await tx
    .select({ id: cameras.id })
    .from(cameras)
    .where(eq(cameras.id, cameraId))
    .for("update");
  if (!camera) throw new Error("Máy ảnh không còn tồn tại.");
  const existing = await tx
    .select()
    .from(cameraRecipes)
    .where(eq(cameraRecipes.cameraId, cameraId));
  if (images.some((i) => i.id && !existing.some((old) => old.id === i.id)))
    throw new Error(
      "Ảnh công thức không thuộc máy ảnh này. Vui lòng tải lại biểu mẫu.",
    );
  const retained = new Set(images.map((i) => i.id));
  for (const old of existing)
    if (!retained.has(old.id))
      await tx.delete(cameraRecipes).where(eq(cameraRecipes.id, old.id));
  for (const [displayOrder, image] of images.entries()) {
    const data = { cameraId, imageUrl: image.imageUrl, displayOrder };
    if (image.id)
      await tx
        .update(cameraRecipes)
        .set(data)
        .where(eq(cameraRecipes.id, image.id));
    else await tx.insert(cameraRecipes).values(data);
  }
}
