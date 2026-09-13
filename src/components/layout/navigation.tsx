"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { House, Camera, ClipboardList, UserRound } from "lucide-react";
const links = [
  { href: "/", label: "Trang chủ", icon: House },
  { href: "/cameras", label: "Thuê máy", icon: Camera },
  { href: "/rentals", label: "Đơn thuê", icon: ClipboardList },
  { href: "/account", label: "Tài khoản", icon: UserRound },
];
export function Navigation({ mobile = false }: { mobile?: boolean }) {
  const path = usePathname();
  return (
    <nav
      aria-label={mobile ? "Điều hướng di động" : "Điều hướng chính"}
      className={mobile ? "bottom-nav" : "desktop-nav"}
    >
      {links.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          aria-current={
            (
              href === "/"
                ? path === href
                : path === href ||
                  path.startsWith(`${href}/`) ||
                  (href === "/account" &&
                    ["/login", "/register"].includes(path))
            )
              ? "page"
              : undefined
          }
        >
          <Icon size={20} />
          <span>{label}</span>
        </Link>
      ))}
    </nav>
  );
}
