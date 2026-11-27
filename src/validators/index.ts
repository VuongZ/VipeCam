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
export const cameraImageInputSchema = z.object({
  id: z.uuid().optional(),
  imageUrl: safeUrl.refine(Boolean, "Vui lòng tải ảnh lên."),
  displayOrder: z.coerce.number().int().min(0).max(1000000),
  isPrimary: z.boolean(),
});
export const cameraImagesSchema = z
  .array(cameraImageInputSchema)
  .max(50, "Mỗi thiết bị tối đa 50 ảnh.")
  .refine(
    (images) =>
      !images.length || images.filter((image) => image.isPrimary).length === 1,
    "Chọn đúng một ảnh đại diện.",
  )
  .refine((images) => {
    const ids = images.flatMap((image) => (image.id ? [image.id] : []));
    return new Set(ids).size === ids.length;
  }, "Danh sách ảnh bị trùng.");
export type CameraImageInput = z.infer<typeof cameraImageInputSchema>;
export const cameraRecipesSchema = z
  .array(cameraImageInputSchema.omit({ isPrimary: true }))
  .max(50, "Mỗi máy tối đa 50 ảnh công thức.")
  .refine((images) => {
    const ids = images.flatMap((i) => (i.id ? [i.id] : []));
    return new Set(ids).size === ids.length;
  }, "Ảnh công thức bị trùng.");
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
  images: cameraImagesSchema.optional(),
  recipeImages: cameraRecipesSchema.optional(),
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
export const feedbackSchema = z
  .object({
    customerName: z.string().trim().max(250).default(""),
    avatarUrl: safeUrl.nullable().default(null),
    rating: z.coerce.number().int().min(1).max(5).default(5),
    content: body.max(2000).default(""),
    imageUrl: safeUrl.default(""),
    platform: z.enum(["FACEBOOK", "TIKTOK", "OTHER"]).default("OTHER"),
    socialUrl: safeUrl
      .refine(
        (value) => !value || value.startsWith("https://"),
        "Liên kết mạng xã hội phải dùng HTTPS.",
      )
      .default(""),
    displayOrder: z.coerce.number().int().min(0).max(1000000).default(0),
    isVisible: z.boolean(),
    isFeatured: z.boolean(),
  })
  .refine((value) => Boolean(value.imageUrl || value.content), {
    path: ["imageUrl"],
    message: "Vui lòng tải ảnh feedback hoặc nhập nội dung.",
  });
export const socialUrl = z
  .string()
  .trim()
  .pipe(safeUrl)
  .refine(
    (value) => !value || value.startsWith("https://"),
    "Liên kết mạng xã hội phải là URL HTTPS đầy đủ.",
  );
export const settingsSchema = z.object({
  shopName: line,
  logoUrl: z.literal("/images/logo.png").default("/images/logo.png"),
  phone: z.string().max(30),
  zalo: safeUrl,
  facebookUrl: socialUrl,
  tiktokUrl: socialUrl,
  email: z.union([z.email(), z.literal("")]),
  address: body.max(500),
  defaultDepositText: body,
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
export const zaloPhoneSchema = z
  .string()
  .trim()
  .transform((v) =>
    v
      .replace(/[\s().-]/g, "")
      .replace(/^\+84/, "0")
      .replace(/^84(?=[35789]\d{8}$)/, "0"),
  )
  .pipe(
    z
      .string()
      .regex(
        /^0[35789]\d{8}$/,
        "Nhập số di động Việt Nam hợp lệ (10 chữ số hoặc +84).",
      ),
  );
export const signUpSchema = signInSchema.extend({
  name: line,
  phone: zaloPhoneSchema,
});
export const profileSchema = z.object({ name: line, phone: zaloPhoneSchema });

export const rentalPolicySchema = z.object({
  title: line,
  imageUrl: safeUrl.refine(Boolean, "Vui lòng tải ảnh quy định."),
  displayOrder: z.coerce.number().int().min(0).max(1000000),
  isActive: z.boolean(),
});
