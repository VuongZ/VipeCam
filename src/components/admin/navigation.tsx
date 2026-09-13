"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Camera,
  Grid2X2,
  Tags,
  ClipboardList,
  MessageSquare,
  Image,
  Users,
  Settings,
} from "lucide-react";
const links = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/cameras", label: "Máy ảnh", icon: Camera },
  { href: "/admin/categories", label: "Danh mục", icon: Grid2X2 },
  { href: "/admin/prices", label: "Giá thuê", icon: Tags },
  { href: "/admin/rentals", label: "Đơn thuê", icon: ClipboardList },
  { href: "/admin/feedbacks", label: "Feedback", icon: MessageSquare },
  { href: "/admin/banners", label: "Banner", icon: Image },
  { href: "/admin/users", label: "Người dùng", icon: Users },
  { href: "/admin/settings", label: "Cài đặt", icon: Settings },
];
export function AdminNavigation({ mobile = false }: { mobile?: boolean }) {
  const path = usePathname();
  const router = useRouter();
  if (mobile)
    return (
      <select
        aria-label="Điều hướng quản trị"
        className="admin-mobile-nav"
        value={path === "/admin/images" ? "/admin/cameras" : path}
        onChange={(e) => router.push(e.target.value)}
      >
        {links.map((l) => (
          <option key={l.href} value={l.href}>
            {l.label}
          </option>
        ))}
      </select>
    );
  return (
    <nav aria-label="Quản trị">
      {links.map(({ href, label, icon: Icon }) => (
        <Link
          href={href}
          key={href}
          aria-current={
            path === href ||
            (href === "/admin/cameras" && path === "/admin/images")
              ? "page"
              : undefined
          }
        >
          <Icon size={19} />
          {label}
        </Link>
      ))}
    </nav>
  );
}
