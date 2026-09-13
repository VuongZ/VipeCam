import { getSettings } from "@/services/catalog";
export const metadata = { title: "Chính sách thuê & điều khoản" };
export default async function Policies() {
  const shop = await getSettings();
  return (
    <div className="container page-space">
      <h1>Chính sách thuê</h1>
      <p className="prose-content">
        {shop.rentalPolicy || "Cửa hàng đang cập nhật chính sách thuê."}
      </p>
      <h2 className="mt-10">Tiền cọc</h2>
      <p className="prose-content">{shop.defaultDepositText}</p>
      <h2 className="mt-10">Điều khoản</h2>
      <p className="prose-content">
        {shop.terms || "Cửa hàng đang cập nhật điều khoản."}
      </p>
    </div>
  );
}
