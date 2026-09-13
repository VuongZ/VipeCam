export type Field = {
  key: string;
  label: string;
  type?:
    "text" | "textarea" | "number" | "boolean" | "select" | "image" | "json";
  required?: boolean;
  source?: "cameras" | "categories";
  options?: { value: string; label: string }[];
  default?: string | number | boolean;
  hint?: string;
};
export type Resource = {
  title: string;
  singular: string;
  fields: Field[];
  columns: {
    key: string;
    label: string;
    type?: "money" | "boolean" | "status" | "camera" | "category";
  }[];
};
const active: Field = {
  key: "isActive",
  label: "Hiển thị / hoạt động",
  type: "boolean",
  default: true,
};
const order: Field = {
  key: "displayOrder",
  label: "Thứ tự hiển thị",
  type: "number",
  default: 0,
};
const camera: Field = {
  key: "cameraId",
  label: "Thiết bị",
  type: "select",
  source: "cameras",
  required: true,
};
export const resources: Record<string, Resource> = {
  cameras: {
    title: "Máy ảnh & thiết bị",
    singular: "thiết bị",
    fields: [
      { key: "name", label: "Tên thiết bị", required: true },
      { key: "slug", label: "Slug", required: true, hint: "Ví dụ: sony-a7-iv" },
      { key: "brand", label: "Thương hiệu", required: true },
      { key: "model", label: "Model", required: true },
      {
        key: "categoryId",
        label: "Danh mục",
        type: "select",
        source: "categories",
        required: true,
      },
      { key: "shortDescription", label: "Mô tả ngắn", required: true },
      {
        key: "description",
        label: "Mô tả chi tiết",
        type: "textarea",
        required: true,
      },
      {
        key: "specifications",
        label: "Thông số kỹ thuật",
        type: "json",
        hint: "Mỗi dòng: tên thông số: giá trị. Ví dụ: Cảm biến: Full-frame 33MP",
      },
      { key: "deposit", label: "Tiền cọc (đ)", type: "number", default: 0 },
      {
        key: "quantity",
        label: "Số lượng thiết bị",
        type: "number",
        default: 1,
      },
      {
        key: "status",
        label: "Tình trạng",
        type: "select",
        default: "AVAILABLE",
        options: [
          { value: "AVAILABLE", label: "Có sẵn" },
          { value: "RENTED", label: "Đang cho thuê" },
          { value: "MAINTENANCE", label: "Bảo trì" },
          { value: "INACTIVE", label: "Ngừng cho thuê" },
        ],
      },
      {
        key: "isFeatured",
        label: "Thiết bị nổi bật",
        type: "boolean",
        default: false,
      },
      active,
    ],
    columns: [
      { key: "name", label: "Thiết bị" },
      { key: "brand", label: "Hãng" },
      { key: "categoryId", label: "Danh mục", type: "category" },
      { key: "quantity", label: "Số lượng" },
      { key: "status", label: "Tình trạng", type: "status" },
      { key: "isActive", label: "Hiển thị", type: "boolean" },
    ],
  },
  categories: {
    title: "Danh mục",
    singular: "danh mục",
    fields: [
      { key: "name", label: "Tên danh mục", required: true },
      { key: "slug", label: "Slug", required: true },
      {
        key: "icon",
        label: "Biểu tượng",
        type: "select",
        default: "Camera",
        options: [
          { value: "Camera", label: "Máy ảnh" },
          { value: "Aperture", label: "Lens" },
          { value: "Lightbulb", label: "Đèn" },
          { value: "Focus", label: "Gimbal" },
          { value: "Mic", label: "Microphone" },
          { value: "Triangle", label: "Tripod" },
          { value: "Package", label: "Phụ kiện" },
        ],
      },
      order,
      active,
    ],
    columns: [
      { key: "name", label: "Danh mục" },
      { key: "slug", label: "Slug" },
      { key: "displayOrder", label: "Thứ tự" },
      { key: "isActive", label: "Hiển thị", type: "boolean" },
    ],
  },
  prices: {
    title: "Giá thuê",
    singular: "mức giá",
    fields: [
      camera,
      { key: "name", label: "Tên gói", required: true },
      {
        key: "durationDays",
        label: "Số ngày thuê",
        type: "number",
        default: 1,
      },
      { key: "price", label: "Giá cả gói (đ)", type: "number", default: 0 },
      order,
      active,
    ],
    columns: [
      { key: "cameraId", label: "Thiết bị", type: "camera" },
      { key: "name", label: "Gói thuê" },
      { key: "durationDays", label: "Số ngày" },
      { key: "price", label: "Giá", type: "money" },
      { key: "displayOrder", label: "Thứ tự" },
      { key: "isActive", label: "Hoạt động", type: "boolean" },
    ],
  },
  images: {
    title: "Ảnh thiết bị",
    singular: "ảnh",
    fields: [
      camera,
      { key: "imageUrl", label: "Ảnh thiết bị", type: "image", required: true },
      order,
      {
        key: "isPrimary",
        label: "Dùng làm ảnh chính",
        type: "boolean",
        default: false,
      },
    ],
    columns: [
      { key: "cameraId", label: "Thiết bị", type: "camera" },
      { key: "imageUrl", label: "Đường dẫn ảnh" },
      { key: "displayOrder", label: "Thứ tự" },
      { key: "isPrimary", label: "Ảnh chính", type: "boolean" },
    ],
  },
  banners: {
    title: "Banner",
    singular: "banner",
    fields: [
      { key: "title", label: "Tiêu đề", required: true },
      {
        key: "subtitle",
        label: "Nội dung phụ",
        type: "textarea",
        required: true,
      },
      { key: "imageUrl", label: "Ảnh banner", type: "image", required: true },
      { key: "buttonText", label: "Chữ trên nút", required: true },
      {
        key: "linkUrl",
        label: "Liên kết",
        required: true,
        default: "/cameras",
      },
      order,
      active,
    ],
    columns: [
      { key: "title", label: "Tiêu đề" },
      { key: "buttonText", label: "Nút" },
      { key: "displayOrder", label: "Thứ tự" },
      { key: "isActive", label: "Hiển thị", type: "boolean" },
    ],
  },
  feedbacks: {
    title: "Feedback",
    singular: "đánh giá",
    fields: [
      { key: "customerName", label: "Tên khách hàng", required: true },
      { key: "avatarUrl", label: "Ảnh đại diện", type: "image" },
      { key: "rating", label: "Số sao (1–5)", type: "number", default: 5 },
      { key: "content", label: "Nội dung", type: "textarea", required: true },
      {
        key: "isVisible",
        label: "Hiển thị công khai",
        type: "boolean",
        default: true,
      },
      {
        key: "isFeatured",
        label: "Ưu tiên trên trang chủ",
        type: "boolean",
        default: false,
      },
    ],
    columns: [
      { key: "customerName", label: "Khách hàng" },
      { key: "rating", label: "Số sao" },
      { key: "content", label: "Nội dung" },
      { key: "isVisible", label: "Hiển thị", type: "boolean" },
      { key: "isFeatured", label: "Nổi bật", type: "boolean" },
    ],
  },
};
export const settingsFields: Field[] = [
  { key: "shopName", label: "Tên cửa hàng", required: true },
  { key: "logoUrl", label: "Logo", type: "image" },
  { key: "phone", label: "Số điện thoại" },
  { key: "zalo", label: "Liên kết Zalo" },
  { key: "facebook", label: "Liên kết Facebook" },
  { key: "email", label: "Email" },
  { key: "address", label: "Địa chỉ", type: "textarea" },
  { key: "defaultDepositText", label: "Hướng dẫn tiền cọc", type: "textarea" },
  { key: "rentalPolicy", label: "Chính sách thuê", type: "textarea" },
  { key: "terms", label: "Điều khoản", type: "textarea" },
  { key: "about", label: "Giới thiệu", type: "textarea" },
  { key: "footerText", label: "Nội dung chân trang", type: "textarea" },
];
