import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAvailability } from "@/services/booking";
const schema = z
  .object({ cameraId: z.uuid(), start: z.iso.date(), end: z.iso.date() })
  .refine((v) => v.end >= v.start);
export async function GET(request: NextRequest) {
  const parsed = schema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams),
  );
  if (!parsed.success)
    return NextResponse.json({ error: "Ngày không hợp lệ." }, { status: 400 });
  try {
    const v = parsed.data;
    return NextResponse.json(
      { available: await getAvailability(v.cameraId, v.start, v.end) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      { error: "Chưa kiểm tra được lịch thuê." },
      { status: 503 },
    );
  }
}
