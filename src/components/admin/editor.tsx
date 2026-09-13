"use client";
import { SafeImage } from "@/components/ui/safe-image";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { Field } from "@/lib/admin-resources";
import {
  bannerSchema,
  cameraSchema,
  categorySchema,
  feedbackSchema,
  imageSchema,
  priceSchema,
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
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const set = (key: string, value: unknown) =>
    setValues((v) => ({ ...v, [key]: value }));
  async function upload(file: File | undefined, key: string) {
    if (!file) return;
    if (
      file.size > 5 * 1024 * 1024 ||
      !["image/jpeg", "image/png", "image/webp"].includes(file.type)
    )
      return toast.error("Chọn ảnh JPEG, PNG, WebP tối đa 5 MB.");
    setUploading(true);
    try {
      const data = new FormData();
      data.set("file", file);
      const response = await fetch("/api/upload", {
        method: "POST",
        body: data,
      });
      const result = await response.json();
      if (!response.ok) toast.error(result.error);
      else {
        set(key, result.url);
        toast.success("Đã tải ảnh. Lưu biểu mẫu để áp dụng.");
      }
    } catch {
      toast.error("Không tải được ảnh. Vui lòng thử lại.");
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
        const payload = { ...values };
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
                accept="image/jpeg,image/png,image/webp"
                disabled={uploading}
                onChange={(e) => void upload(e.target.files?.[0], field.key)}
              />
              <p className="helper-text mt-1">JPEG, PNG, WebP · Tối đa 5 MB</p>
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
