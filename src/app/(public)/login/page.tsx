import { AuthForm } from "@/components/auth-form";
export const metadata = { title: "Đăng nhập" };
export default function Login() {
  return (
    <div className="container page-space">
      <AuthForm />
    </div>
  );
}
