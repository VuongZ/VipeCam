"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { resources } from "@/lib/admin-resources";
import { money, statusLabels } from "@/lib/utils";
import { saveResource, deleteResource } from "@/actions/admin";
import { Button } from "@/components/ui/button";
import { Confirm } from "@/components/ui/confirm";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Editor, type AdminRecord, type Choices } from "./editor";
export function ResourceManager({
  resource,
  rows,
  choices,
  initialCamera = "",
}: {
  resource: string;
  rows: AdminRecord[];
  choices: Choices;
  initialCamera?: string;
}) {
  const config = resources[resource];
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("");
  const [cameraFilter, setCameraFilter] = useState(initialCamera);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AdminRecord | undefined>();
  const [pending, run] = useTransition();
  const visible = rows.filter(
    (row) =>
      Object.values(row).some((v) =>
        String(v).toLowerCase().includes(query.toLowerCase()),
      ) &&
      (!filter ||
        String(row.status ?? row.isActive ?? row.isVisible) === filter) &&
      (!cameraFilter || row.cameraId === cameraFilter) &&
      (!categoryFilter || row.categoryId === categoryFilter),
  );
  function value(row: AdminRecord, col: (typeof config.columns)[number]) {
    const v = row[col.key];
    if (col.type === "money") return money(Number(v));
    if (col.type === "boolean")
      return <span className="badge">{v ? "Có" : "Không"}</span>;
    if (col.type === "status")
      return <span className="badge">{statusLabels[String(v)]}</span>;
    if (col.type === "camera" || col.type === "category")
      return (
        choices[col.type === "camera" ? "cameras" : "categories"].find(
          (c) => c.id === v,
        )?.name || "—"
      );
    const text = String(v ?? "—");
    return text.length > 90 ? `${text.slice(0, 90)}…` : text;
  }
  return (
    <>
      <div className="admin-heading">
        <div>
          <span className="eyebrow">QUẢN LÝ NỘI DUNG</span>
          <h1>{config.title}</h1>
        </div>
        <Button
          onClick={() => {
            setEditing(
              cameraFilter ? { id: "", cameraId: cameraFilter } : undefined,
            );
            setOpen(true);
          }}
        >
          <Plus size={18} />
          Thêm {config.singular}
        </Button>
      </div>
      {resource === "cameras" && (
        <div className="flex gap-3 mb-5">
          <Link className="button button-outline" href="/admin/images">
            Quản lý ảnh
          </Link>
          <Link className="button button-outline" href="/admin/prices">
            Quản lý giá thuê
          </Link>
        </div>
      )}
      <div className="admin-toolbar">
        <input
          placeholder="Tìm kiếm..."
          aria-label="Tìm trong danh sách"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {resource === "cameras" && (
          <select
            aria-label="Lọc danh mục"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="">Tất cả danh mục</option>
            {choices.categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        )}
        {["images", "prices"].includes(resource) && (
          <select
            aria-label="Lọc thiết bị"
            value={cameraFilter}
            onChange={(e) => setCameraFilter(e.target.value)}
          >
            <option value="">Tất cả thiết bị</option>
            {choices.cameras.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        )}
        {resource !== "images" && (
          <select
            aria-label="Lọc trạng thái"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="">Tất cả trạng thái</option>
            {resource === "cameras" ? (
              ["AVAILABLE", "RENTED", "MAINTENANCE", "INACTIVE"].map((s) => (
                <option key={s} value={s}>
                  {statusLabels[s]}
                </option>
              ))
            ) : (
              <>
                <option value="true">Đang hiển thị</option>
                <option value="false">Đang ẩn</option>
              </>
            )}
          </select>
        )}
      </div>
      <p className="result-count">{visible.length} kết quả</p>
      {visible.length ? (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                {config.columns.map((col) => (
                  <th key={col.key}>{col.label}</th>
                ))}
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((row) => (
                <tr key={row.id}>
                  {config.columns.map((col) => (
                    <td key={col.key}>
                      {value(row, col)}
                      {resource === "cameras" && col.key === "name" && (
                        <div className="flex gap-3 mt-2">
                          <Link
                            className="text-primary text-xs py-2"
                            href={`/admin/images?camera=${row.id}`}
                          >
                            Ảnh
                          </Link>
                          <Link
                            className="text-primary text-xs py-2"
                            href={`/admin/prices?camera=${row.id}`}
                          >
                            Giá thuê
                          </Link>
                        </div>
                      )}
                    </td>
                  ))}
                  <td>
                    <div className="table-actions">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Chỉnh sửa"
                        onClick={() => {
                          setEditing(row);
                          setOpen(true);
                        }}
                      >
                        <Pencil size={17} />
                      </Button>
                      <Confirm
                        onConfirm={() =>
                          run(async () => {
                            try {
                              const result = await deleteResource(
                                resource,
                                row.id,
                              );
                              if (result.error) toast.error(result.error);
                              else {
                                toast.success("Đã xóa.");
                                router.refresh();
                              }
                            } catch {
                              toast.error(
                                "Không thể kết nối. Vui lòng thử lại.",
                              );
                            }
                          })
                        }
                      >
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Xóa"
                          disabled={pending}
                        >
                          <Trash2 size={17} className="text-red-600" />
                        </Button>
                      </Confirm>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty-state">
          <h2>Chưa có nội dung phù hợp</h2>
          <p>Thêm nội dung mới hoặc thay đổi bộ lọc.</p>
        </div>
      )}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent>
          <SheetTitle className="text-xl font-semibold pr-8">
            {editing?.id ? "Chỉnh sửa" : "Thêm"} {config.singular}
          </SheetTitle>
          <SheetDescription className="text-muted mt-2">
            Kiểm tra nội dung trước khi lưu.
          </SheetDescription>
          <Editor
            key={editing?.id || "new"}
            fields={config.fields}
            record={editing}
            choices={choices}
            resource={resource}
            onSave={async (data) => {
              const result = await saveResource(
                resource,
                editing?.id || null,
                data,
              );
              if (!result.error) {
                toast.success("Đã lưu thay đổi.");
                setOpen(false);
                router.refresh();
              }
              return result;
            }}
          />
        </SheetContent>
      </Sheet>
    </>
  );
}
