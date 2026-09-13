import { z } from "zod";
const line = z.string().trim().min(1, "Vui lòng điền trường này.").max(250);
const body = z.string().trim().max(15000);
const amount = z.coerce.number().int().min(0).max(100000000);
export const safeUrl = z
  .string()
  .max(2000)
  .refine((v) => {
    if (!v) return true;
    if (/[\\\u0000-\u0020\u007f]/.test(v)) return false;
    try {
      const url = new URL(v, "https://vipecam.invalid");
      return v.startsWith("/")
        ? !v.startsWith("//") && url.origin === "https://vipecam.invalid"
        : v.startsWith("https://") &&
            url.protocol === "https:" &&
            !url.username &&
            !url.password;
    } catch {
      return false;
    }
  }, "Dùng đường dẫn nội bộ hoặc URL https.");
const slug = z
  .string()
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    "Slug chỉ gồm chữ thường, số và dấu gạch ngang.",
  )
  .max(150);
export const categorySchema = z.object({
  name: line,
  slug,
  icon: line,
  displayOrder: z.coerce.number().int().min(0),
  isActive: z.boolean(),
});
export const cameraSchema = z.object({
  name: line,
  slug,
  brand: line,
  model: line,
  description: body.min(1),
  shortDescription: line,
  specifications: z.record(z.string().max(100), z.string().max(500)),
  deposit: amount,
  quantity: z.coerce.number().int().min(0).max(1000),
  status: z.enum(["AVAILABLE", "RENTED", "MAINTENANCE", "INACTIVE"]),
  categoryId: z.uuid(),
  isFeatured: z.boolean(),
  isActive: z.boolean(),
});
export const priceSchema = z.object({
  cameraId: z.uuid(),
  name: line,
  durationDays: z.coerce.number().int().min(1).max(365),
  price: amount.min(1),
  displayOrder: z.coerce.number().int().min(0),
  isActive: z.boolean(),
});
export const imageSchema = z.object({
  cameraId: z.uuid(),
  imageUrl: safeUrl.refine(Boolean, "Vui lòng chọn ảnh."),
  displayOrder: z.coerce.number().int().min(0),
  isPrimary: z.boolean(),
});
export const bannerSchema = z.object({
  title: line,
  subtitle: line,
  imageUrl: safeUrl.refine(Boolean),
  buttonText: line,
  linkUrl: safeUrl.refine(Boolean),
  displayOrder: z.coerce.number().int().min(0),
  isActive: z.boolean(),
});
export const feedbackSchema = z.object({
  customerName: line,
  avatarUrl: safeUrl.nullable(),
  rating: z.coerce.number().int().min(1).max(5),
  content: body.min(1).max(2000),
  isVisible: z.boolean(),
  isFeatured: z.boolean(),
});
export const settingsSchema = z.object({
  shopName: line,
  logoUrl: safeUrl,
  phone: z.string().max(30),
  zalo: safeUrl,
  facebook: safeUrl,
  email: z.union([z.email(), z.literal("")]),
  address: body.max(500),
  defaultDepositText: body,
  rentalPolicy: body,
  terms: body,
  about: body,
  footerText: body.max(500),
});
export const bookingSchema = z
  .object({
    cameraId: z.uuid(),
    rentalPriceId: z.uuid(),
    startDate: z.iso.date(),
    endDate: z.iso.date(),
    quantity: z.coerce.number().int().min(1).max(20),
    note: z.string().trim().max(2000).default(""),
  })
  .refine((v) => v.endDate >= v.startDate, {
    path: ["endDate"],
    message: "Ngày trả phải từ ngày nhận trở đi.",
  });
export const signInSchema = z.object({
  email: z.email("Email không hợp lệ."),
  password: z.string().min(10, "Mật khẩu cần ít nhất 10 ký tự.").max(128),
});
export const signUpSchema = signInSchema.extend({ name: line });
