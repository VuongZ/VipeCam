import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
export function imageType(
  buffer: Uint8Array,
): { mime: string; extension: string } | null {
  if (buffer.length < 16) return null;
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff)
    return { mime: "image/jpeg", extension: "jpg" };
  if ([137, 80, 78, 71, 13, 10, 26, 10].every((n, i) => buffer[i] === n))
    return { mime: "image/png", extension: "png" };
  if (
    String.fromCharCode(...buffer.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...buffer.slice(8, 12)) === "WEBP"
  )
    return { mime: "image/webp", extension: "webp" };
  return null;
}
export async function storeImage(
  buffer: Uint8Array,
  mime: string,
  extension: string,
) {
  const key = `uploads/${crypto.randomUUID()}.${extension}`;
  if (process.env.STORAGE_DRIVER === "r2") {
    const {
      R2_ACCOUNT_ID,
      R2_ACCESS_KEY_ID,
      R2_SECRET_ACCESS_KEY,
      R2_BUCKET_NAME,
      R2_PUBLIC_URL,
    } = process.env;
    if (
      !R2_ACCOUNT_ID ||
      !R2_ACCESS_KEY_ID ||
      !R2_SECRET_ACCESS_KEY ||
      !R2_BUCKET_NAME ||
      !R2_PUBLIC_URL?.startsWith("https://")
    )
      throw new Error("Chưa cấu hình đầy đủ kho ảnh R2.");
    const client = new S3Client({
      region: "auto",
      endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY,
      },
    });
    await client.send(
      new PutObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: key,
        Body: buffer,
        ContentType: mime,
        CacheControl: "public, max-age=31536000, immutable",
      }),
    );
    return `${R2_PUBLIC_URL.replace(/\/$/, "")}/${key}`;
  }
  if (process.env.NODE_ENV === "production")
    throw new Error("Cần cấu hình R2 để tải ảnh trong production.");
  const target = path.join(process.cwd(), "public", key);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, buffer);
  return `/${key}`;
}
