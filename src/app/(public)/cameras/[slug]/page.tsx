import Link from "next/link";
import { notFound } from "next/navigation";
import { getCatalog, getSettings } from "@/services/catalog";
import { Gallery } from "@/components/camera/gallery";
import { BookingForm } from "@/components/rental/booking-form";
import { statusLabels } from "@/lib/utils";
import { RentalPolicyGallery } from "@/components/rental-policy-gallery";
type Props = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const [camera] = await getCatalog(slug);
  if (!camera) return {};
  const image = (
    camera.images.find((image) => image.isPrimary) || camera.images[0]
  )?.imageUrl;
  const images = image
    ? [
        new URL(
          image,
          process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
        ).href,
      ]
    : [];
  return {
    title: camera.name,
    description: camera.shortDescription,
    openGraph: {
      title: camera.name,
      description: camera.shortDescription,
      images,
    },
    twitter: {
      card: "summary_large_image" as const,
      title: camera.name,
      description: camera.shortDescription,
      images,
    },
  };
}
export default async function Detail({ params }: Props) {
  const { slug } = await params;
  const [[camera], shop] = await Promise.all([getCatalog(slug), getSettings()]);
  if (!camera) notFound();
  return (
    <div className="container page-space detail-page">
      <div className="breadcrumb">
        <Link href="/">Trang chủ</Link>
        <span>/</span>
        <Link href="/cameras">Thiết bị</Link>
        <span>/</span>
        <span>{camera.name}</span>
      </div>
      <div className="detail-grid">
        <div>
          <Gallery images={camera.images} name={camera.name} />
          <div className="detail-copy">
            <h2 className="text-xl mb-4">Một chút về {camera.name}</h2>
            {camera.description}
          </div>
          <h2 className="text-xl">Thông số kỹ thuật</h2>
          <dl className="spec-list">
            {Object.entries(camera.specifications).map(([key, value]) => (
              <div key={key}>
                <dt>{key}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
          {camera.recipeImages.length > 0 && (
            <section
              className="camera-recipe-section"
              aria-labelledby="camera-recipe-title"
            >
              <h2 id="camera-recipe-title" className="text-xl mb-3">
                Công thức chỉnh màu cho {camera.name}
              </h2>
              <p className="text-sm text-muted mb-4">
                Tham khảo thiết lập riêng cho máy ảnh này. Chạm vào ảnh để phóng
                to và xem toàn bộ công thức.
              </p>
              <RentalPolicyGallery
                imageLabel="công thức"
                rows={camera.recipeImages.map((image, index) => ({
                  ...image,
                  title: `${camera.name} — Công thức chỉnh màu ${index + 1}`,
                }))}
              />
            </section>
          )}
          <Link href="/quy-dinh-thue" className="text-primary text-sm">
            Xem chính sách thuê & điều khoản →
          </Link>
        </div>
        <div>
          <span className="eyebrow">
            {camera.brand} / {camera.model}
          </span>
          <h1 className="detail-title">{camera.name}</h1>
          <p className="text-muted text-sm mb-4">{camera.shortDescription}</p>
          <div className="flex gap-3 flex-wrap">
            <span className="badge">{statusLabels[camera.status]}</span>
            <span className="text-sm text-muted">
              Chưa có đánh giá riêng cho thiết bị
            </span>
          </div>
          <BookingForm
            key={camera.id}
            camera={camera}
            depositText={shop.defaultDepositText}
          />
        </div>
      </div>
    </div>
  );
}
