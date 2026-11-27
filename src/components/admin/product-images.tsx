"use client";
import { useState, useRef, useId } from "react";
import { ArrowUp, ArrowDown, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { CameraImageInput } from "@/validators";
import { uploadImage } from "@/lib/upload-image";
import { SafeImage } from "@/components/ui/safe-image";
import { Button } from "@/components/ui/button";
import { IMAGE_ACCEPT, IMAGE_HELP } from "@/lib/image-formats";

export function ProductImages({
  images,
  onChange,
  disabled,
  onUploading,
  title = "Hình ảnh sản phẩm",
  primarySelection = true,
}: {
  images: CameraImageInput[];
  onChange: (images: CameraImageInput[]) => void;
  disabled: boolean;
  onUploading: (uploading: boolean) => void;
  title?: string;
  primarySelection?: boolean;
}) {
  const radioName = useId();
  const [progress, setProgress] = useState("");
  const processing = useRef(false);
  function update(next: CameraImageInput[]) {
    const primary = next.some((image) => image.isPrimary);
    onChange(
      next.map((image, index) => ({
        ...image,
        displayOrder: index,
        isPrimary: primary ? image.isPrimary : index === 0,
      })),
    );
  }
  async function upload(files: File[], replace?: number) {
    if (!files.length || processing.current) return;
    if (replace === undefined && images.length + files.length > 50) {
      toast.error("Mỗi thiết bị tối đa 50 ảnh.");
      return;
    }
    processing.current = true;
    onUploading(true);
    const next = [...images];
    let uploaded = 0;
    try {
      for (const [index, file] of files.entries()) {
        setProgress(`Đang tải ảnh ${index + 1}/${files.length}…`);
        try {
          const imageUrl = await uploadImage(file);
          if (replace !== undefined)
            next[replace] = { ...next[replace], imageUrl };
          else
            next.push({
              imageUrl,
              displayOrder: next.length,
              isPrimary: false,
            });
          uploaded++;
          update([...next]);
        } catch (error) {
          toast.error(
            `${file.name}: ${error instanceof Error ? error.message : "Không thể kết nối."}`,
          );
        }
      }
      if (uploaded)
        toast.success(`Đã tải ${uploaded} ảnh. Lưu sản phẩm để áp dụng.`);
    } finally {
      setProgress("");
      processing.current = false;
      onUploading(false);
    }
  }
  function move(index: number, offset: number) {
    const next = [...images];
    [next[index], next[index + offset]] = [next[index + offset], next[index]];
    update(next);
  }
  return (
    <fieldset
      className="product-images"
      disabled={disabled}
      onDragOver={(event) => {
        event.preventDefault();
      }}
      onDrop={(event) => {
        event.preventDefault();
        event.stopPropagation();
        if (!disabled) void upload(Array.from(event.dataTransfer.files));
      }}
    >
      <legend>{title}</legend>
      <label>
        Thêm nhiều ảnh
        <input
          type="file"
          multiple
          accept={IMAGE_ACCEPT}
          onChange={(event) => {
            const files = Array.from(event.target.files || []);
            event.target.value = "";
            void upload(files);
          }}
        />
      </label>
      <p className="helper-text">
        {IMAGE_HELP} Kéo thả ảnh vào đây hoặc chọn nhiều file. Tối đa 50 ảnh;
        bấm Lưu thay đổi để áp dụng.
      </p>
      <p role="status">{progress}</p>
      {!images.length && (
        <p className="text-sm text-muted">
          Chưa có ảnh. Chọn ảnh để xem trước.
        </p>
      )}
      <div className="product-image-list">
        {images.map((image, index) => (
          <div className="product-image-item" key={image.id || image.imageUrl}>
            <SafeImage
              src={image.imageUrl}
              alt={`${primarySelection ? "Ảnh sản phẩm" : "Ảnh công thức"} ${index + 1}`}
              className="product-image-preview"
            />
            <div className="product-image-controls">
              {primarySelection && (
                <label className="check-label">
                  <input
                    type="radio"
                    name={radioName}
                    checked={image.isPrimary}
                    onChange={() =>
                      update(
                        images.map((item, position) => ({
                          ...item,
                          isPrimary: position === index,
                        })),
                      )
                    }
                  />
                  Ảnh đại diện {index + 1}
                </label>
              )}
              <label className="image-replace">
                Thay ảnh {index + 1}
                <input
                  type="file"
                  accept={IMAGE_ACCEPT}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    event.target.value = "";
                    if (file) void upload([file], index);
                  }}
                />
              </label>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  aria-label={`Đưa ảnh ${index + 1} lên`}
                  disabled={disabled || index === 0}
                  onClick={() => move(index, -1)}
                >
                  <ArrowUp size={18} />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  aria-label={`Đưa ảnh ${index + 1} xuống`}
                  disabled={disabled || index === images.length - 1}
                  onClick={() => move(index, 1)}
                >
                  <ArrowDown size={18} />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  aria-label={`Xóa ảnh ${index + 1}`}
                  onClick={() =>
                    update(images.filter((_, position) => position !== index))
                  }
                >
                  <Trash2 size={18} />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </fieldset>
  );
}
