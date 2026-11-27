"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Button } from "./ui/button";
import { toast } from "sonner";
import { z } from "zod";
import { profileSchema } from "@/validators";
export function AccountForm({
  name,
  email,
  phone,
}: {
  name: string;
  email: string;
  phone?: string | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function handle(
    action: () => Promise<{ error?: unknown }>,
    success: string,
  ) {
    setBusy(true);
    try {
      const result = await action();
      if (result.error) {
        toast.error("Không thể cập nhật. Kiểm tra thông tin và thử lại.");
        return false;
      } else {
        toast.success(success);
        router.refresh();
        return true;
      }
    } catch {
      toast.error("Không thể kết nối. Vui lòng thử lại.");
      return false;
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="account-grid">
        <form
          className="panel form-stack"
          onSubmit={(e) => {
            e.preventDefault();
            const data = new FormData(e.currentTarget);
            const parsed = profileSchema.safeParse(Object.fromEntries(data));
            if (!parsed.success)
              return toast.error(parsed.error.issues[0].message);
            void handle(
              () => authClient.updateUser(parsed.data),
              "Đã lưu thông tin.",
            );
          }}
        >
          <h2 className="text-xl">Thông tin cá nhân</h2>
          <label>
            Họ và tên
            <input name="name" defaultValue={name} required maxLength={250} />
          </label>
          <label>
            Email
            <input value={email} readOnly />
          </label>
          <label>
            Số điện thoại sử dụng Zalo
            <input
              name="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              defaultValue={phone || ""}
              required
              maxLength={30}
              placeholder="0901234567 hoặc +84901234567"
            />
          </label>
          <Button disabled={busy}>Lưu thông tin</Button>
        </form>
        <form
          className="panel form-stack"
          onSubmit={(e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const data = new FormData(form);
            const parsed = z
              .object({
                currentPassword: z.string().min(1),
                newPassword: z.string().min(10).max(128),
              })
              .safeParse(Object.fromEntries(data));
            if (!parsed.success)
              return toast.error("Mật khẩu mới cần ít nhất 10 ký tự.");
            void handle(
              () =>
                authClient.changePassword({
                  ...parsed.data,
                  revokeOtherSessions: true,
                }),
              "Đã đổi mật khẩu.",
            ).then((saved) => {
              if (saved) form.reset();
            });
          }}
        >
          <h2 className="text-xl">Đổi mật khẩu</h2>
          <label>
            Mật khẩu hiện tại
            <input
              type="password"
              name="currentPassword"
              autoComplete="current-password"
              required
            />
          </label>
          <label>
            Mật khẩu mới
            <input
              type="password"
              name="newPassword"
              autoComplete="new-password"
              minLength={10}
              maxLength={128}
              required
            />
          </label>
          <Button variant="outline" disabled={busy}>
            Cập nhật mật khẩu
          </Button>
        </form>
      </div>
      <Button
        variant="outline"
        className="mt-6"
        disabled={busy}
        onClick={() =>
          handle(async () => {
            const result = await authClient.signOut();
            if (!result.error) {
              router.push("/login");
              router.refresh();
            }
            return result;
          }, "Đã đăng xuất.")
        }
      >
        Đăng xuất
      </Button>
    </>
  );
}
