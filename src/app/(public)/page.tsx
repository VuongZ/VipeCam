import { FeedbackGallery } from "@/components/feedback-gallery";
import Link from "next/link";
import {
  ArrowRight,
  ShieldCheck,
  CalendarDays,
  Headphones,
} from "lucide-react";
import {
  getBanners,
  getCatalog,
  getFeedbacks,
  getSettings,
} from "@/services/catalog";
import { BannerCarousel } from "@/components/banner-carousel";
import { CameraCard } from "@/components/camera/card";
export async function generateMetadata() {
  const shop = await getSettings();
  return { title: shop.shopName, description: shop.about.slice(0, 160) };
}
export default async function Home() {
  const [banners, cameras, feedbacks] = await Promise.all([
    getBanners(),
    getCatalog(),
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
                <CameraCard key={c.id} camera={c} imageCarousel={false} />
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
        <FeedbackGallery rows={feedbacks} />
      </section>
    </div>
  );
}
