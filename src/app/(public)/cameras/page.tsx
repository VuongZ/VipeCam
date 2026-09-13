import { getCatalog, getCategories } from "@/services/catalog";
import { Catalog } from "@/components/camera/catalog";
export const metadata = { title: "Thiết bị cho thuê" };
export default async function CamerasPage() {
  const [cameras, categories] = await Promise.all([
    getCatalog(),
    getCategories(),
  ]);
  return (
    <div className="container page-space">
      <span className="eyebrow">CHỌN THIẾT BỊ CỦA BẠN</span>
      <h1>Cho mọi góc nhìn.</h1>
      <p className="page-intro">
        Tìm chiếc máy phù hợp, chọn ngày và bắt đầu câu chuyện của bạn.
      </p>
      <Catalog cameras={cameras} categories={categories} />
    </div>
  );
}
