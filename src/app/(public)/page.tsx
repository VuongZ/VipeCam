import { SafeImage } from "@/components/ui/safe-image";
import Link from "next/link";
import {
  ArrowRight,
  Camera,
  Aperture,
  Lightbulb,
  Focus,
  Mic,
  Triangle,
  Package,
  Search,
  ShieldCheck,
  CalendarDays,
  Headphones,
  Star,
} from "lucide-react";
import {
  getBanners,
  getCatalog,
  getCategories,
  getFeedbacks,
  getSettings,
} from "@/services/catalog";
import { BannerCarousel } from "@/components/banner-carousel";
import { CameraCard } from "@/components/camera/card";
export async function generateMetadata() {
  const shop = await getSettings();
  return { title: shop.shopName, description: shop.about.slice(0, 160) };
}
const icons: Record<string, typeof Camera> = {
  Camera,
  Aperture,
  Lightbulb,
  Focus,
  Mic,
  Triangle,
  Package,
};
export default async function Home() {
  const [banners, cameras, categories, feedbacks] = await Promise.all([
    getBanners(),
    getCatalog(),
    getCategories(),
    getFeedbacks(),
  ]);
  return (
    <div className="container home-page">
      <BannerCarousel banners={banners} />
      {!banners.length && <h1 className="mt-6">Khám phá thiết bị cho thuê</h1>}
      <div className="benefit-strip">
        <span>
          <ShieldCheck /> Thiết bị được kiểm tra kỹ
        </span>
        <span>
          <CalendarDays /> Thời gian thuê linh hoạt
        </span>
        <span>
          <Headphones /> Hướng dẫn khi nhận máy
        </span>
      </div>
      <section className="home-discovery">
        <div>
          <span className="eyebrow">BẮT ĐẦU TẠI ĐÂY</span>
          <h2>Bạn muốn sáng tạo điều gì?</h2>
        </div>
        <form action="/cameras" className="search-box">
          <Search size={20} />
          <input
            name="q"
            aria-label="Tìm thiết bị"
            placeholder="Tìm máy ảnh, lens, phụ kiện..."
          />
          <button type="submit" aria-label="Tìm kiếm">
            <ArrowRight size={19} />
          </button>
        </form>
      </section>
      <div className="category-grid">
        {categories.map((c) => {
          const Icon = icons[c.icon] || Camera;
          return (
            <Link key={c.id} href={`/cameras?category=${c.id}`}>
              <span>
                <Icon size={25} strokeWidth={1.5} />
              </span>
              <strong>{c.name}</strong>
            </Link>
          );
        })}
      </div>
      <section className="section-space">
        <div className="section-heading">
          <div>
            <span className="eyebrow">SẴN SÀNG CHO GÓC NHÌN MỚI</span>
            <h2>Máy được thuê nhiều</h2>
          </div>
          <Link href="/cameras">
            Xem tất cả <ArrowRight size={18} />
          </Link>
        </div>
        {cameras.filter((c) => c.isFeatured).length ? (
          <div className="camera-grid">
            {cameras
              .filter((c) => c.isFeatured)
              .slice(0, 8)
              .map((c) => (
                <CameraCard key={c.id} camera={c} />
              ))}
          </div>
        ) : (
          <div className="empty-state">
            Chưa có thiết bị nổi bật.{" "}
            <Link href="/cameras">Khám phá tất cả thiết bị</Link>
          </div>
        )}
      </section>
      <section className="feedback-section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">SAU MỖI CHUYẾN ĐI</span>
            <h2>Khách hàng nói gì?</h2>
          </div>
          <span className="text-muted">Những trải nghiệm được chia sẻ</span>
        </div>
        {feedbacks.length ? (
          <div className="feedback-carousel">
            {feedbacks.map((f) => (
              <article className="feedback-card" key={f.id}>
                <div className="stars" aria-label={`${f.rating} trên 5 sao`}>
                  {Array.from({ length: f.rating }, (_, i) => (
                    <Star key={i} size={15} fill="currentColor" />
                  ))}
                </div>
                <blockquote>“{f.content}”</blockquote>
                <div className="feedback-person">
                  {f.avatarUrl ? (
                    <SafeImage
                      src={f.avatarUrl}
                      alt=""
                      width={40}
                      height={40}
                    />
                  ) : (
                    <span>{f.customerName.slice(0, 1)}</span>
                  )}
                  <div>
                    <strong>{f.customerName}</strong>
                    <small>
                      {new Intl.DateTimeFormat("vi-VN").format(f.createdAt)}
                    </small>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-state">Chưa có đánh giá nào.</div>
        )}
      </section>
    </div>
  );
}
