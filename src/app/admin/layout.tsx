import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { BrandLogo } from "@/components/layout/brand-logo";
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
  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <Link href="/admin" className="logo">
          <BrandLogo preload />
        </Link>
        <AdminNavigation />
        <Link className="button button-outline mt-auto" href="/">
          <ArrowLeft size={17} />
          Về cửa hàng
        </Link>
      </aside>
      <main id="main-content" className="admin-main">
        <Link className="mobile-admin-title logo" href="/">
          <BrandLogo />
        </Link>
        <AdminNavigation mobile />
        {children}
      </main>
    </div>
  );
}
