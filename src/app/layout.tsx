import type { Metadata, Viewport } from "next";
import { Toaster } from "sonner";
import "./globals.css";
import { PwaRegister } from "@/components/pwa-register";
export const metadata: Metadata = {
  title: { default: "Thuê máy ảnh", template: "%s | Thuê máy ảnh" },
  description: "Chọn máy ảnh, xem lịch trống và đặt thuê thiết bị trực tuyến.",
  icons: { icon: "/icon.svg", apple: "/icons/icon-192.png" },
  manifest: "/manifest.webmanifest",
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#EC4899",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi">
      <body>
        <a className="skip-link" href="#main-content">
          Đến nội dung chính
        </a>
        {children}
        <Toaster richColors position="top-center" closeButton />
        <PwaRegister />
      </body>
    </html>
  );
}
