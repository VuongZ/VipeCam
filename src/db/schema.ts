import {
  pgTable,
  pgEnum,
  text,
  timestamp,
  boolean,
  integer,
  bigint,
  uuid,
  date,
  jsonb,
  index,
  check,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
const times = () => ({
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});
export const roleEnum = pgEnum("user_role", ["CUSTOMER", "ADMIN"]);
export const cameraStatus = pgEnum("camera_status", [
  "AVAILABLE",
  "RENTED",
  "MAINTENANCE",
  "INACTIVE",
]);
export const rentalStatus = pgEnum("rental_status", [
  "PENDING",
  "CONFIRMED",
  "RENTING",
  "COMPLETED",
  "CANCELLED",
]);
export const user = pgTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  role: roleEnum("role").default("CUSTOMER").notNull(),
  phone: text("phone"),
  ...times(),
});
export const session = pgTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at").notNull(),
    token: text("token").notNull().unique(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    ...times(),
  },
  (t) => [index("session_user_idx").on(t.userId)],
);
export const account = pgTable(
  "auth_accounts",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    ...times(),
  },
  (t) => [index("account_user_idx").on(t.userId)],
);
export const verification = pgTable("verifications", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  ...times(),
});
export const rateLimit = pgTable("rate_limits", {
  id: text("id").primaryKey(),
  key: text("key").unique().notNull(),
  count: integer("count").notNull(),
  lastRequest: bigint("last_request", { mode: "number" }).notNull(),
});
export const categories = pgTable("categories", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  icon: text("icon").default("Camera").notNull(),
  displayOrder: integer("display_order").default(0).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  ...times(),
});
export const cameras = pgTable(
  "cameras",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    brand: text("brand").notNull(),
    model: text("model").notNull(),
    description: text("description").notNull(),
    shortDescription: text("short_description").notNull(),
    specifications: jsonb("specifications")
      .$type<Record<string, string>>()
      .default({})
      .notNull(),
    deposit: integer("deposit").notNull(),
    quantity: integer("quantity").default(1).notNull(),
    status: cameraStatus("status").default("AVAILABLE").notNull(),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "restrict" }),
    isFeatured: boolean("is_featured").default(false).notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    ...times(),
  },
  (t) => [
    check(
      "camera_amounts_positive",
      sql`${t.deposit} >= 0 AND ${t.quantity} >= 0`,
    ),
    index("camera_category_idx").on(t.categoryId),
  ],
);
export const cameraImages = pgTable(
  "camera_images",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    cameraId: uuid("camera_id")
      .notNull()
      .references(() => cameras.id, { onDelete: "cascade" }),
    imageUrl: text("image_url").notNull(),
    displayOrder: integer("display_order").default(0).notNull(),
    isPrimary: boolean("is_primary").default(false).notNull(),
    ...times(),
  },
  (t) => [
    uniqueIndex("one_primary_image")
      .on(t.cameraId)
      .where(sql`${t.isPrimary} = true`),
    index("camera_image_order_idx").on(t.cameraId, t.displayOrder),
  ],
);
export const rentalPrices = pgTable(
  "rental_prices",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    cameraId: uuid("camera_id")
      .notNull()
      .references(() => cameras.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    durationDays: integer("duration_days").notNull(),
    price: integer("price").notNull(),
    displayOrder: integer("display_order").default(0).notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    ...times(),
  },
  (t) => [
    check("price_positive", sql`${t.price} > 0 AND ${t.durationDays} > 0`),
    index("rental_price_camera_idx").on(t.cameraId, t.isActive, t.displayOrder),
  ],
);
export const cameraRecipes = pgTable(
  "camera_recipes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    cameraId: uuid("camera_id")
      .notNull()
      .references(() => cameras.id, { onDelete: "cascade" }),
    imageUrl: text("image_url").notNull(),
    displayOrder: integer("display_order").default(0).notNull(),
    ...times(),
  },
  (t) => [index("camera_recipe_order_idx").on(t.cameraId, t.displayOrder)],
);
export const rentals = pgTable(
  "rentals",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    rentalCode: text("rental_code").notNull().unique(),
    startDate: date("start_date").notNull(),
    endDate: date("end_date").notNull(),
    subtotal: integer("subtotal").notNull(),
    deposit: integer("deposit").notNull(),
    totalAmount: integer("total_amount").notNull(),
    status: rentalStatus("status").default("PENDING").notNull(),
    note: text("note"),
    ...times(),
  },
  (t) => [
    index("rental_overlap_idx").on(t.status, t.startDate, t.endDate),
    index("rental_user_idx").on(t.userId),
    index("rental_created_idx").on(t.createdAt),
    check("rental_valid_dates", sql`${t.endDate} >= ${t.startDate}`),
    check(
      "rental_totals",
      sql`${t.subtotal} >= 0 AND ${t.deposit} >= 0 AND ${t.totalAmount} = ${t.subtotal} + ${t.deposit}`,
    ),
  ],
);
export const rentalItems = pgTable(
  "rental_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    rentalId: uuid("rental_id")
      .notNull()
      .references(() => rentals.id, { onDelete: "cascade" }),
    cameraId: uuid("camera_id")
      .notNull()
      .references(() => cameras.id, { onDelete: "restrict" }),
    rentalPriceId: uuid("rental_price_id").references(() => rentalPrices.id, {
      onDelete: "set null",
    }),
    cameraName: text("camera_name").notNull(),
    priceName: text("price_name").notNull(),
    quantity: integer("quantity").notNull(),
    unitPrice: integer("unit_price").notNull(),
    totalPrice: integer("total_price").notNull(),
  },
  (t) => [
    index("rental_item_camera_idx").on(t.cameraId),
    index("rental_item_rental_idx").on(t.rentalId),
    index("rental_item_price_idx").on(t.rentalPriceId),
    check(
      "item_positive",
      sql`${t.quantity} > 0 AND ${t.unitPrice} > 0 AND ${t.totalPrice} = ${t.unitPrice} * ${t.quantity}`,
    ),
  ],
);
export const feedbackPlatform = pgEnum("feedback_platform", [
  "FACEBOOK",
  "TIKTOK",
  "OTHER",
]);
export const feedbacks = pgTable(
  "feedbacks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    customerName: text("customer_name").default("").notNull(),
    avatarUrl: text("avatar_url"),
    rating: integer("rating").default(5).notNull(),
    content: text("content").default("").notNull(),
    imageUrl: text("image_url").default("").notNull(),
    platform: feedbackPlatform("platform").default("OTHER").notNull(),
    socialUrl: text("social_url").default("").notNull(),
    displayOrder: integer("display_order").default(0).notNull(),
    isVisible: boolean("is_visible").default(true).notNull(),
    isFeatured: boolean("is_featured").default(false).notNull(),
    ...times(),
  },
  (t) => [
    check("rating_range", sql`${t.rating} BETWEEN 1 AND 5`),
    index("feedback_display_idx").on(
      t.isVisible,
      t.isFeatured,
      t.displayOrder,
      t.createdAt,
    ),
  ],
);
export const banners = pgTable("banners", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: text("title").notNull(),
  subtitle: text("subtitle").notNull(),
  imageUrl: text("image_url").notNull(),
  buttonText: text("button_text").notNull(),
  linkUrl: text("link_url").notNull(),
  displayOrder: integer("display_order").default(0).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  ...times(),
});
export const settings = pgTable("settings", {
  id: text("id").primaryKey().default("shop"),
  shopName: text("shop_name").notNull(),
  logoUrl: text("logo_url").default("").notNull(),
  phone: text("phone").default("").notNull(),
  zalo: text("zalo").default("").notNull(),
  facebook: text("facebook").default("").notNull(),
  facebookUrl: text("facebook_url").default("").notNull(),
  tiktokUrl: text("tiktok_url").default("").notNull(),
  email: text("email").default("").notNull(),
  address: text("address").default("").notNull(),
  defaultDepositText: text("default_deposit_text").default("").notNull(),
  rentalPolicy: text("rental_policy").default("").notNull(),
  terms: text("terms").default("").notNull(),
  about: text("about").default("").notNull(),
  footerText: text("footer_text").default("").notNull(),
  ...times(),
});

export const rentalPolicies = pgTable(
  "rental_policies",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    title: text("title").notNull(),
    imageUrl: text("image_url").notNull(),
    displayOrder: integer("display_order").default(0).notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    ...times(),
  },
  (t) => [
    index("rental_policies_display_idx").on(t.isActive, t.displayOrder),
    check("rental_policies_order_check", sql`${t.displayOrder} >= 0`),
  ],
);
