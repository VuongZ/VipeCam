import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { imageType, storeImage } from "@/services/storage";
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
  const max = 5 * 1024 * 1024;
  const length = Number(request.headers.get("content-length"));
  if (!Number.isFinite(length) || length <= 0 || length > max + 65536)
    return NextResponse.json({ error: "Ảnh tối đa 5 MB." }, { status: 413 });
  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File) || !file.size || file.size > max)
      return NextResponse.json({ error: "Ảnh tối đa 5 MB." }, { status: 400 });
    const buffer = new Uint8Array(await file.arrayBuffer());
    const type = imageType(buffer);
    if (!type || file.type !== type.mime)
      return NextResponse.json(
        { error: "Chỉ nhận ảnh JPEG, PNG hoặc WebP hợp lệ." },
        { status: 400 },
      );
    const url = await storeImage(buffer, type.mime, type.extension);
    return NextResponse.json({ url });
  } catch {
    return NextResponse.json(
      { error: "Không tải được ảnh. Kiểm tra cấu hình kho ảnh và thử lại." },
      { status: 500 },
    );
  }
}
