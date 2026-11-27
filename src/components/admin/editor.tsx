"use client";
import { SafeImage } from "@/components/ui/safe-image";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { Field } from "@/lib/admin-resources";
import { ProductImages } from "./product-images";
import type { CameraImageInput } from "@/validators";
import { uploadImage } from "@/lib/upload-image";
import { IMAGE_ACCEPT, IMAGE_HELP } from "@/lib/image-formats";
import {
  bannerSchema,
  cameraSchema,
  categorySchema,
  feedbackSchema,
  imageSchema,
  priceSchema,
  rentalPolicySchema,
  settingsSchema,
} from "@/validators";
export type AdminRecord = Record<string, unknown> & { id: string };
export type Choices = {
  cameras: { id: string; name: string }[];
  categories: { id: string; name: string }[];
};
const schemas = {
  cameras: cameraSchema,
  categories: categorySchema,
  prices: priceSchema,
  images: imageSchema,
  banners: bannerSchema,
  feedbacks: feedbackSchema,
  settings: settingsSchema,
  "rental-policies": rentalPolicySchema,
};
export function Editor({
  fields,
  record,
  choices,
  resource,
  onSave,
}: {
  fields: Field[];
  record?: AdminRecord;
  choices: Choices;
  resource: string;
  onSave: (data: Record<string, unknown>) => Promise<{ error?: string }>;
}) {
  const [values, setValues] = useState<Record<string, unknown>>(() =>
    Object.fromEntries(
      fields.map((f) => [
        f.key,
        f.type === "json"
          ? Object.entries((record?.[f.key] || {}) as Record<string, string>)
              .map(([k, v]) => `${k}: ${v}`)
              .join("\n")
          : (record?.[f.key] ??
            f.default ??
            (f.type === "boolean" ? false : "")),
      ]),
    ),
  );
  const [busy, setBusy] = useState(false);
  const [images, setImages] = useState<CameraImageInput[]>(() => {
    const existing = (record?.images || []) as CameraImageInput[];
    const hasPrimary = existing.some((image) => image.isPrimary);
    return existing.map((image, index) => ({
      ...image,
      isPrimary: hasPrimary ? image.isPrimary : index === 0,
    }));
  });
  const [uploading, setUploading] = useState(false);
  const [recipeImages, setRecipeImages] = useState<CameraImageInput[]>(() =>
    ((record?.recipeImages || []) as CameraImageInput[]).map((image, i) => ({
      ...image,
      isPrimary: i === 0,
    })),
  );
  const [error, setError] = useState("");
  const set = (key: string, value: unknown) =>
    setValues((v) => ({ ...v, [key]: value }));
  async function upload(file: File | undefined, key: string) {
    if (!file) return;
    setUploading(true);
    try {
      set(key, await uploadImage(file));
      toast.success("Đã tải ảnh. Lưu biểu mẫu để áp dụng.");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Không tải được ảnh. Vui lòng thử lại.",
      );
    } finally {
      setUploading(false);
    }
  }
  return (
    <form
      className="admin-form"
      onSubmit={async (e) => {
        e.preventDefault();
        if (busy || uploading) return;
        setError("");
        const payload: Record<string, unknown> = {
          ...values,
          ...(resource === "cameras" ? { images, recipeImages } : {}),
        };
        for (const field of fields)
          if (field.type === "json") {
            const entries = String(payload[field.key])
              .split("\n")
              .filter((line) => line.trim())
              .map((line) => {
                const index = line.indexOf(":");
                return index > 0
                  ? [line.slice(0, index).trim(), line.slice(index + 1).trim()]
                  : null;
              });
            if (entries.some((entry) => !entry)) {
              setError(
                "Thông số cần theo dạng: tên: giá trị, mỗi dòng một thông số.",
              );
              return;
            }
            payload[field.key] = Object.fromEntries(entries as string[][]);
          }
        const parsed =
          schemas[resource as keyof typeof schemas].safeParse(payload);
        if (!parsed.success) {
          setError(parsed.error.issues[0].message);
          return;
        }
        setBusy(true);
        try {
          const result = await onSave(parsed.data);
          if (result.error) setError(result.error);
        } catch {
          setError("Không thể lưu. Vui lòng thử lại.");
        } finally {
          setBusy(false);
        }
      }}
    >
      {fields.map((field) => (
        <div key={field.key}>
          {field.type === "boolean" ? (
            <label className="check-label">
              <input
                type="checkbox"
                aria-label={field.label}
                checked={Boolean(values[field.key])}
                onChange={(e) => set(field.key, e.target.checked)}
              />
              {field.label}
            </label>
          ) : (
            <label>
              {field.label}
              {field.type === "select" ? (
                <select
                  aria-label={field.label}
                  value={String(values[field.key])}
                  required={field.required}
                  onChange={(e) => set(field.key, e.target.value)}
                >
                  <option value="">Chọn {field.label.toLowerCase()}</option>
                  {(field.source
                    ? choices[field.source].map((c) => ({
                        value: c.id,
                        label: c.name,
                      }))
                    : field.options || []
                  ).map((o) => (
                    <option value={o.value} key={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              ) : field.type === "textarea" || field.type === "json" ? (
                <textarea
                  aria-label={field.label}
                  value={String(values[field.key])}
                  required={field.required}
                  maxLength={15000}
                  rows={4}
                  onChange={(e) => set(field.key, e.target.value)}
                />
              ) : (
                <input
                  aria-label={field.label}
                  type={field.type === "number" ? "number" : "text"}
                  min={field.type === "number" ? 0 : undefined}
                  step={field.type === "number" ? 1 : undefined}
                  maxLength={field.type === "image" ? 2000 : 250}
                  value={String(values[field.key])}
                  required={field.required}
                  onChange={(e) => set(field.key, e.target.value)}
                />
              )}
              {field.hint && <span className="helper-text">{field.hint}</span>}
            </label>
          )}
          {field.type === "image" && (
            <div className="mt-2">
              <input
                aria-label={`Tải ${field.label.toLowerCase()}`}
                type="file"
                accept={IMAGE_ACCEPT}
                disabled={uploading}
                onChange={(e) => void upload(e.target.files?.[0], field.key)}
              />
              <p className="helper-text mt-1">{IMAGE_HELP}</p>
              {Boolean(values[field.key]) && (
                <SafeImage
                  src={String(values[field.key])}
                  className="upload-preview mt-3"
                  alt="Ảnh xem trước"
                />
              )}
            </div>
          )}
        </div>
      ))}
      {resource === "cameras" && (
        <>
          <ProductImages
            images={images}
            onChange={setImages}
            disabled={busy || uploading}
            onUploading={setUploading}
          />
          <ProductImages
            title="Công thức chỉnh màu của máy ảnh"
            primarySelection={false}
            images={recipeImages}
            onChange={setRecipeImages}
            disabled={busy || uploading}
            onUploading={setUploading}
          />
        </>
      )}
      {error && (
        <p className="error-text" role="alert">
          {error}
        </p>
      )}
      <Button type="submit" disabled={busy || uploading}>
        {uploading ? "Đang tải ảnh…" : busy ? "Đang lưu…" : "Lưu thay đổi"}
      </Button>
    </form>
  );
}
