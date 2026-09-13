import { SafeImage } from "@/components/ui/safe-image";
import Link from "next/link";
import { Aperture, Search, UserRound, ArrowUpRight } from "lucide-react";
import { Navigation } from "./navigation";
import { getSettings } from "@/services/catalog";
export async function PublicShell({ children }: { children: React.ReactNode }) {
  const shop = await getSettings();
  return (
    <>
      <header className="site-header">
        <div className="container header-inner">
          <Link href="/" className="logo">
            {shop.logoUrl ? (
              <SafeImage src={shop.logoUrl} width={32} height={32} alt="" />
            ) : (
              <Aperture size={29} />
            )}
            <span>
              {shop.shopName}
              <b>.</b>
            </span>
          </Link>
          <Navigation />
          <div className="header-actions">
            <Link
              href="/cameras"
              aria-label="Tìm thiết bị"
              className="icon-link"
            >
              <Search size={21} />
            </Link>
            <Link href="/account" aria-label="Tài khoản" className="icon-link">
              <UserRound size={21} />
            </Link>
            <Link href="/cameras" className="header-cta">
              Chọn máy ngay <ArrowUpRight size={17} />
            </Link>
          </div>
        </div>
      </header>
      <main id="main-content">{children}</main>
      <footer className="site-footer">
        <div className="container footer-grid">
          <div>
            <Link href="/" className="logo">
              <Aperture size={27} />
              {shop.shopName}
              <b>.</b>
            </Link>
            <p>{shop.footerText}</p>
          </div>
          <div>
            <strong>Khám phá</strong>
            <Link href="/cameras">Thiết bị cho thuê</Link>
            <Link href="/policies">Chính sách thuê & điều khoản</Link>
            <Link href="/about">Về cửa hàng</Link>
          </div>
          <div>
            <strong>Liên hệ</strong>
            {shop.phone && <a href={`tel:${shop.phone}`}>{shop.phone}</a>}
            {shop.email && <a href={`mailto:${shop.email}`}>{shop.email}</a>}
            {shop.address && <p>{shop.address}</p>}
            {shop.zalo && <a href={shop.zalo}>Zalo</a>}
            {shop.facebook && <a href={shop.facebook}>Facebook</a>}
            {!shop.phone && !shop.email && (
              <p>Thông tin liên hệ đang được cập nhật.</p>
            )}
          </div>
        </div>
        <div className="container footer-bottom">
          © {new Date().getFullYear()} {shop.shopName}
        </div>
      </footer>
      <Navigation mobile />
    </>
  );
}
