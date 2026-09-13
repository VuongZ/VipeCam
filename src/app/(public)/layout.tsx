import { PublicShell } from "@/components/layout/shell";
export const dynamic = "force-dynamic";
export default function Layout({ children }: { children: React.ReactNode }) {
  return <PublicShell>{children}</PublicShell>;
}
