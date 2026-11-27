import { MAX_IMAGE_BYTES } from "./image-formats";
export async function uploadImage(file: File) {
  if (!file.size || file.size > MAX_IMAGE_BYTES) {
    throw new Error("Chọn ảnh có dung lượng tối đa 10 MB.");
  }
  const data = new FormData();
  data.set("file", file);
  const response = await fetch("/api/upload", { method: "POST", body: data });
  const result = await response.json();
  if (!response.ok || typeof result.url !== "string")
    throw new Error(result.error || "Không tải được ảnh. Vui lòng thử lại.");
  return result.url as string;
}
