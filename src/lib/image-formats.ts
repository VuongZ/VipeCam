export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const MAX_IMAGE_PIXELS = 40_000_000;
export const IMAGE_ACCEPT =
  ".jpg,.jpeg,.png,.webp,.gif,.bmp,.heic,.heif,.avif,.tif,.tiff,image/jpeg,image/png,image/webp,image/gif,image/bmp,image/heic,image/heif,image/avif,image/tiff";
export const IMAGE_HELP =
  "JPG, PNG, WebP, GIF, BMP, HEIC, HEIF, AVIF, TIFF · Tối đa 10 MB/ảnh. GIF và TIFF nhiều trang dùng khung hình đầu tiên.";

export function detectImage(buffer: Uint8Array): string | null {
  if (buffer.length < 16) return null;
  const text = (start: number, end: number) =>
    String.fromCharCode(...buffer.slice(start, end));
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff)
    return "jpeg";
  if ([137, 80, 78, 71, 13, 10, 26, 10].every((n, i) => buffer[i] === n))
    return "png";
  if (text(0, 4) === "RIFF" && text(8, 12) === "WEBP") return "webp";
  if (["GIF87a", "GIF89a"].includes(text(0, 6))) return "gif";
  if (text(0, 2) === "BM") return "bmp";
  if (["II*\0", "MM\0*", "II+\0", "MM\0+"].includes(text(0, 4))) return "tiff";
  if (text(4, 8) === "ftyp") {
    const brands = [text(8, 12)];
    const size = new DataView(
      buffer.buffer,
      buffer.byteOffset,
      buffer.byteLength,
    ).getUint32(0);
    for (
      let offset = 16;
      offset + 4 <= Math.min(size, buffer.length, 256);
      offset += 4
    )
      brands.push(text(offset, offset + 4));
    if (brands.some((b) => ["avif", "avis"].includes(b))) return "avif";
    if (
      brands.some((b) =>
        ["heic", "heix", "hevc", "hevx", "mif1", "msf1"].includes(b),
      )
    )
      return "heic";
  }
  return null;
}

export function checkDimensions(width: number, height: number) {
  if (
    !Number.isInteger(width) ||
    !Number.isInteger(height) ||
    width < 1 ||
    height < 1 ||
    width > 12000 ||
    height > 12000 ||
    width * height > MAX_IMAGE_PIXELS
  )
    throw new Error("Ảnh tối đa 40 megapixel và 12.000 pixel mỗi chiều.");
}
