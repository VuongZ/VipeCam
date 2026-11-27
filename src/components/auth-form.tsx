"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { signInSchema, signUpSchema } from "@/validators";
import { Button } from "./ui/button";
export function AuthForm({ register = false }: { register?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <div className="auth-card">
      <span className="eyebrow">GÓC SÁNG TẠO CỦA BẠN</span>
      <h1>{register ? "Tạo tài khoản" : "Chào bạn trở lại."}</h1>
      <p>
        {register
          ? "Lưu thông tin và theo dõi những đơn thuê của bạn."
          : "Đăng nhập để chọn lịch thuê và quản lý đơn hàng."}
      </p>
      <form
        className="form-stack"
        onSubmit={async (e) => {
          e.preventDefault();
          const input = Object.fromEntries(new FormData(e.currentTarget));
          const parsed = (register ? signUpSchema : signInSchema).safeParse(
            input,
          );
          if (!parsed.success) {
            setError(parsed.error.issues[0].message);
            return;
          }
          setBusy(true);
          setError("");
          try {
            const result = register
              ? await authClient.signUp.email({
                  ...parsed.data,
                  name: String(input.name),
                  phone: signUpSchema.parse(input).phone,
                })
              : await authClient.signIn.email(parsed.data);
            if (result.error) {
              setError(
                result.error.status === 429
                  ? "Bạn thao tác quá nhanh. Vui lòng thử lại sau một phút."
                  : register
                    ? "Không thể tạo tài khoản. Hãy kiểm tra email hoặc thử đăng nhập."
                    : "Email hoặc mật khẩu không đúng.",
              );
            } else {
              toast.success(
                register
                  ? "Tạo tài khoản thành công."
                  : "Đăng nhập thành công.",
              );
              router.push("/account");
              router.refresh();
            }
          } catch {
            setError("Không thể kết nối. Vui lòng thử lại.");
          } finally {
            setBusy(false);
          }
        }}
      >
        {register && (
          <label>
            Họ và tên
            <input name="name" autoComplete="name" required maxLength={250} />
          </label>
        )}
        <label>
          Email
          <input name="email" type="email" autoComplete="email" required />
        </label>
        {register && (
          <label>
            Số điện thoại sử dụng Zalo
            <input
              aria-label="Số điện thoại sử dụng Zalo"
              name="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              required
              maxLength={30}
              placeholder="0901234567 hoặc +84901234567"
            />
            <span className="helper-text">
              Dùng để cửa hàng liên hệ về đơn thuê.
            </span>
          </label>
        )}
        <label>
          Mật khẩu
          <input
            name="password"
            type="password"
            autoComplete={register ? "new-password" : "current-password"}
            minLength={10}
            maxLength={128}
            required
          />
        </label>
        {register && <span className="helper-text">Tối thiểu 10 ký tự.</span>}
        {error && (
          <p className="error-text" role="alert">
            {error}
          </p>
        )}
        <Button disabled={busy}>
          {busy ? "Đang xử lý…" : register ? "Đăng ký" : "Đăng nhập"}
        </Button>
      </form>
      <p className="mt-6">
        {register ? "Đã có tài khoản? " : "Chưa có tài khoản? "}
        <Link className="auth-switch" href={register ? "/login" : "/register"}>
          {register ? "Đăng nhập" : "Đăng ký ngay"}
        </Link>
      </p>
    </div>
  );
}
