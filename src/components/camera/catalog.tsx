"use client";
import { useState, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { SlidersHorizontal, Search } from "lucide-react";
import type { CatalogCamera } from "@/services/catalog";
import type { categories as table } from "@/db/schema";
import { CameraCard } from "./card";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from "@/components/ui/sheet";
type Props = {
  cameras: CatalogCamera[];
  categories: (typeof table.$inferSelect)[];
};
function CatalogInner({ cameras, categories }: Props) {
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") || "");
  const [category, setCategory] = useState(params.get("category") || "");
  const [brand, setBrand] = useState("");
  const [max, setMax] = useState("");
  const [available, setAvailable] = useState(false);
  const [sort, setSort] = useState("featured");
  const [open, setOpen] = useState(false);
  const filtered = useMemo(
    () =>
      cameras
        .filter(
          (c) =>
            `${c.name} ${c.brand} ${c.model}`
              .toLowerCase()
              .includes(q.toLowerCase()) &&
            (!category || c.categoryId === category) &&
            (!brand || c.brand === brand) &&
            (!max || c.prices.some((p) => p.price <= Number(max))) &&
            (!available ||
              (c.quantity > 0 &&
                !["MAINTENANCE", "INACTIVE"].includes(c.status))),
        )
        .sort((a, b) => {
          const price = (c: CatalogCamera) =>
            c.prices.length
              ? Math.min(...c.prices.map((p) => p.price))
              : Infinity;
          return sort === "asc"
            ? price(a) - price(b)
            : sort === "desc"
              ? price(b) - price(a)
              : sort === "name"
                ? a.name.localeCompare(b.name)
                : Number(b.isFeatured) - Number(a.isFeatured);
        }),
    [cameras, q, category, brand, max, available, sort],
  );
  const filters = (
    <>
      <label>
        Danh mục
        <select
          aria-label="Danh mục"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="">Tất cả danh mục</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        Thương hiệu
        <select
          aria-label="Thương hiệu"
          value={brand}
          onChange={(e) => setBrand(e.target.value)}
        >
          <option value="">Tất cả thương hiệu</option>
          {[...new Set(cameras.map((c) => c.brand))].map((b) => (
            <option key={b}>{b}</option>
          ))}
        </select>
      </label>
      <label>
        Giá gói thuê tối đa
        <input
          type="number"
          min="0"
          placeholder="Không giới hạn"
          value={max}
          onChange={(e) => setMax(e.target.value)}
        />
      </label>
      <label className="check-label">
        <input
          type="checkbox"
          checked={available}
          onChange={(e) => setAvailable(e.target.checked)}
        />
        Có thiết bị cho thuê
      </label>
      <p className="text-sm text-muted">
        Lịch trống chính xác được kiểm tra theo ngày tại trang chi tiết.
      </p>
      <Button
        variant="outline"
        onClick={() => {
          setCategory("");
          setBrand("");
          setMax("");
          setAvailable(false);
          setQ("");
        }}
      >
        Xóa bộ lọc
      </Button>
    </>
  );
  return (
    <>
      <div className="catalog-toolbar">
        <div className="search-box">
          <Search size={20} />
          <input
            aria-label="Tìm thiết bị"
            placeholder="Tìm tên máy ảnh, thương hiệu..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" className="mobile-filter">
              <SlidersHorizontal size={18} />
              Bộ lọc
            </Button>
          </SheetTrigger>
          <SheetContent>
            <SheetTitle className="text-xl font-semibold">
              Lọc thiết bị
            </SheetTitle>
            <SheetDescription className="text-muted mt-2">
              Tìm thiết bị phù hợp với buổi chụp.
            </SheetDescription>
            <div className="form-stack mt-6">
              {filters}
              <Button onClick={() => setOpen(false)}>
                Xem {filtered.length} thiết bị
              </Button>
            </div>
          </SheetContent>
        </Sheet>
        <select
          aria-label="Sắp xếp"
          value={sort}
          onChange={(e) => setSort(e.target.value)}
        >
          <option value="featured">Nổi bật</option>
          <option value="asc">Giá tăng dần</option>
          <option value="desc">Giá giảm dần</option>
          <option value="name">Tên A–Z</option>
        </select>
      </div>
      <div className="catalog-layout">
        <aside className="catalog-filters form-stack">
          <h2 className="text-lg">Bộ lọc</h2>
          {filters}
        </aside>
        <div>
          <p className="result-count">{filtered.length} thiết bị</p>
          {filtered.length ? (
            <div className="camera-grid catalog-grid">
              {filtered.map((c) => (
                <CameraCard key={c.id} camera={c} />
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <Search size={32} />
              <h2>Chưa tìm thấy thiết bị</h2>
              <p>Thử đổi từ khóa hoặc xóa bớt bộ lọc.</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
export function Catalog(props: Props) {
  return (
    <Suspense fallback={<div className="skeleton h-80" />}>
      <CatalogFromUrl {...props} />
    </Suspense>
  );
}
function CatalogFromUrl(props: Props) {
  const params = useSearchParams();
  return <CatalogInner key={params.toString()} {...props} />;
}
