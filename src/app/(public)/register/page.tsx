import { AuthForm } from "@/components/auth-form";
export const metadata = { title: "Đăng ký" };
export default function Register() {
  return (
    <div className="container page-space">
      <AuthForm register />
    </div>
  );
}
