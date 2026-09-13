import { getSettings } from "@/services/catalog";
export const metadata = { title: "Về cửa hàng" };
export default async function About() {
  const shop = await getSettings();
  return (
    <div className="container page-space">
      <h1>Về {shop.shopName}</h1>
      <p className="prose-content">
        {shop.about || "Thông tin đang được cập nhật."}
      </p>
    </div>
  );
}
