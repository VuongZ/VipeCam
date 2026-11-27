import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { storeImage } from "@/services/storage";
import { normalizeImage, InvalidImageError } from "@/services/normalize-image";
import { MAX_IMAGE_BYTES } from "@/lib/image-formats";
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (session?.user.role !== "ADMIN")
    return NextResponse.json(
      { error: "Bạn không có quyền tải ảnh." },
      { status: 403 },
    );
  const trusted = new URL(
    process.env.BETTER_AUTH_URL || "http://localhost:3000",
  ).origin;
  if (request.headers.get("origin") !== trusted)
    return NextResponse.json(
      { error: "Nguồn yêu cầu không hợp lệ." },
      { status: 403 },
    );
  const max = MAX_IMAGE_BYTES;
  const length = Number(request.headers.get("content-length"));
  if (!Number.isFinite(length) || length <= 0 || length > max + 65536)
    return NextResponse.json({ error: "Ảnh tối đa 10 MB." }, { status: 413 });
  try {
    // Bound actual bytes too; Content-Length alone can be forged by a client.
    const reader = request.body?.getReader();
    if (!reader) throw new InvalidImageError("Không có file ảnh.");
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > max + 65536) {
        await reader.cancel();
        return NextResponse.json(
          { error: "Ảnh tối đa 10 MB." },
          { status: 413 },
        );
      }
      chunks.push(value);
    }
    const body = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      body.set(chunk, offset);
      offset += chunk.length;
    }
    const form = await new Response(body, {
      headers: { "content-type": request.headers.get("content-type") || "" },
    }).formData();
    const file = form.get("file");
    if (!(file instanceof File) || !file.size || file.size > max)
      return NextResponse.json({ error: "Ảnh tối đa 10 MB." }, { status: 400 });
    const buffer = new Uint8Array(await file.arrayBuffer());
    const converted = await normalizeImage(buffer);
    const url = await storeImage(converted, "image/webp", "webp");
    return NextResponse.json({ url });
  } catch (error) {
    if (error instanceof InvalidImageError)
      return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json(
      { error: "Không tải được ảnh. Kiểm tra cấu hình kho ảnh và thử lại." },
      { status: 500 },
    );
  }
}
