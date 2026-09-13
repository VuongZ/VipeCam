import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { AccountForm } from "@/components/account-form";
export const metadata = { title: "Tài khoản", robots: { index: false } };
export default async function Account() {
  const user = await requireUser();
  return (
    <div className="container page-space">
      <div className="section-heading">
        <div>
          <span className="eyebrow">TÀI KHOẢN CỦA BẠN</span>
          <h1>Xin chào, {user.name}.</h1>
        </div>
        <Link href="/rentals" className="button button-outline">
          Đơn thuê của tôi
        </Link>
      </div>
      {user.role === "ADMIN" && (
        <Link href="/admin" className="button button-primary">
          Vào trang quản trị
        </Link>
      )}
      <AccountForm name={user.name} email={user.email} />
    </div>
  );
}
