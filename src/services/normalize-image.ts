import { getCloudflareContext } from "@opennextjs/cloudflare";
import {
  detectImage,
  MAX_IMAGE_BYTES,
  checkDimensions,
} from "@/lib/image-formats";

type ImagesBinding = {
  info: (
    stream: ReadableStream<Uint8Array>,
  ) => Promise<{ width?: number; height?: number }>;
  input: (stream: ReadableStream<Uint8Array>) => {
    output: (options: {
      format: string;
      quality: number;
    }) => Promise<{ response: () => Response }>;
  };
};
export class InvalidImageError extends Error {}
export async function normalizeImage(bytes: Uint8Array) {
  if (!bytes.length || bytes.length > MAX_IMAGE_BYTES)
    throw new InvalidImageError("Ảnh tối đa 10 MB.");
  const format = detectImage(bytes);
  if (!format)
    throw new InvalidImageError(
      "File không phải ảnh JPG, PNG, WebP, GIF, BMP, HEIC, HEIF, AVIF hoặc TIFF hợp lệ.",
    );
  let worker: { IMAGES?: ImagesBinding } | undefined;
  try {
    worker = getCloudflareContext().env as { IMAGES?: ImagesBinding };
  } catch {
    /* Node runtime */
  }
  if (worker && !worker.IMAGES)
    throw new Error(
      "Worker cần cấu hình binding IMAGES để kiểm tra và chuyển đổi ảnh.",
    );
  try {
    let output: Uint8Array;
    if (worker?.IMAGES) {
      const stream = () => new Blob([new Uint8Array(bytes)]).stream();
      const info = await worker.IMAGES.info(stream());
      checkDimensions(info.width || 0, info.height || 0);
      const result = await worker.IMAGES.input(stream()).output({
        format: "image/webp",
        quality: 88,
      });
      output = new Uint8Array(await result.response().arrayBuffer());
    } else {
      output = await (
        await import("@/services/normalize-image-node")
      ).normalizeImageNode(bytes, format);
    }
    if (output.length > MAX_IMAGE_BYTES)
      throw new Error("Ảnh sau chuyển đổi vượt quá 10 MB.");
    return output;
  } catch (error) {
    throw new InvalidImageError(
      `Không thể đọc hoặc chuyển đổi ảnh ${format.toUpperCase()}. File có thể bị hỏng, quá lớn hoặc dùng codec chưa được hỗ trợ.${error instanceof Error && error.message.startsWith("Ảnh tối đa") ? ` ${error.message}` : ""}`,
    );
  }
}
