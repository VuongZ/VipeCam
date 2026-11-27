import { getSettings } from "@/services/catalog";
import { SocialLinks } from "@/components/layout/social-links";

export const metadata = { title: "Liên hệ VipeCam" };

export default async function Contact() {
  const shop = await getSettings();
  return (
    <div className="container page-space">
      <h1>Liên hệ {shop.shopName}</h1>
      <div className="panel max-w-2xl contact-details">
        {shop.address && <p>{shop.address}</p>}
        {shop.phone && (
          <a href={`tel:${shop.phone}`}>Điện thoại: {shop.phone}</a>
        )}
        {shop.email && <a href={`mailto:${shop.email}`}>Email: {shop.email}</a>}
        {shop.zalo && (
          <a href={shop.zalo} target="_blank" rel="noopener noreferrer">
            Liên hệ qua Zalo
          </a>
        )}
        {!shop.address && !shop.phone && !shop.email && !shop.zalo && (
          <p>Thông tin liên hệ đang được cập nhật.</p>
        )}
        <SocialLinks
          facebookUrl={shop.facebookUrl}
          tiktokUrl={shop.tiktokUrl}
        />
      </div>
    </div>
  );
}
