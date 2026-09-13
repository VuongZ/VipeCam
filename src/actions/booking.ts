"use server";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { createBooking } from "@/services/booking";
import { ZodError } from "zod";
export async function bookCamera(input: unknown) {
  try {
    const session = await getSession();
    if (!session) return { error: "Vui lòng đăng nhập trước khi đặt thuê." };
    const rental = await createBooking(session.user.id, input);
    revalidatePath("/rentals");
    revalidatePath("/admin");
    return { code: rental.rentalCode };
  } catch (error) {
    return {
      error:
        error instanceof ZodError
          ? error.issues[0].message
          : error instanceof Error && !("query" in error)
            ? error.message
            : "Không thể đặt thuê. Vui lòng thử lại.",
    };
  }
}
