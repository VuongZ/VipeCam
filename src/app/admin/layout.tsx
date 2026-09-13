import Link from "next/link";
import { Aperture, ArrowLeft } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { getSettings } from "@/services/catalog";
import { AdminNavigation } from "@/components/admin/navigation";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Quản trị",
  robots: { index: false, follow: false },
};
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin();
  const shop = await getSettings();
  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <Link href="/admin" className="logo">
          <Aperture size={27} />
          {shop.shopName}
          <b>.</b>
        </Link>
        <AdminNavigation />
        <Link className="button button-outline mt-auto" href="/">
          <ArrowLeft size={17} />
          Về cửa hàng
        </Link>
      </aside>
      <main id="main-content" className="admin-main">
        <Link className="mobile-admin-title logo" href="/">
          {shop.shopName}
          <b>.</b>
        </Link>
        <AdminNavigation mobile />
        {children}
      </main>
    </div>
  );
}
