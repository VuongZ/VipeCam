import sharp, { type Sharp } from "sharp";
import { checkDimensions, MAX_IMAGE_PIXELS } from "@/lib/image-formats";

// Native codecs stay in this module so Worker requests use the Images binding instead.
export async function normalizeImageNode(bytes: Uint8Array, format: string) {
  const buffer = Buffer.from(bytes);
  let image: Sharp;
  if (format === "heic") {
    const decode = (await import("heic-decode")).default;
    const images = await decode.all({ buffer });
    try {
      if (!images.length) throw new Error("Không có ảnh trong file HEIC.");
      checkDimensions(images[0].width, images[0].height);
      const decoded = await images[0].decode();
      image = sharp(Buffer.from(decoded.data), {
        raw: { width: decoded.width, height: decoded.height, channels: 4 },
      });
    } finally {
      images.dispose();
    }
  } else if (format === "bmp") {
    if (
      buffer.length < 54 ||
      buffer.readUInt32LE(14) < 40 ||
      buffer.readUInt32LE(2) > buffer.length ||
      buffer.readUInt32LE(10) >= buffer.length
    )
      throw new Error("File BMP không hợp lệ.");
    checkDimensions(buffer.readInt32LE(18), Math.abs(buffer.readInt32LE(22)));
    const bitDepth = buffer.readUInt16LE(28);
    const compression = buffer.readUInt32LE(30);
    const paletteSize = buffer.readUInt32LE(46);
    if (bitDepth <= 8 && paletteSize > 2 ** bitDepth)
      throw new Error("Bảng màu BMP không hợp lệ.");
    if (
      ![1, 4, 8, 16, 24, 32].includes(bitDepth) ||
      ![0, 1, 2, 3].includes(compression)
    )
      throw new Error("Kiểu mã hóa BMP không được hỗ trợ.");
    if (
      compression === 0 &&
      buffer.readUInt32LE(10) +
        Math.ceil((buffer.readInt32LE(18) * bitDepth) / 32) *
          4 *
          Math.abs(buffer.readInt32LE(22)) >
        buffer.length
    )
      throw new Error("Dữ liệu BMP bị cắt ngắn.");
    const bmp = (await import("bmp-js")).default.decode(buffer);
    checkDimensions(bmp.width, bmp.height);
    const rgba = Buffer.alloc(bmp.width * bmp.height * 4);
    for (let i = 0; i < rgba.length; i += 4) {
      rgba[i] = bmp.data[i + 3];
      rgba[i + 1] = bmp.data[i + 2];
      rgba[i + 2] = bmp.data[i + 1];
      rgba[i + 3] = 255;
    }
    image = sharp(rgba, {
      raw: { width: bmp.width, height: bmp.height, channels: 4 },
    });
  } else {
    image = sharp(buffer, {
      limitInputPixels: MAX_IMAGE_PIXELS,
      failOn: "error",
      animated: false,
    });
    const metadata = await image.metadata();
    checkDimensions(metadata.width, metadata.height);
    if (
      !["jpeg", "png", "webp", "gif", "heif", "avif", "tiff"].includes(
        metadata.format || "",
      )
    )
      throw new Error("Định dạng ảnh không được hỗ trợ.");
  }
  // Decode and encode pixels: strip metadata and any appended non-image payload.
  return new Uint8Array(await image.rotate().webp({ quality: 88 }).toBuffer());
}
