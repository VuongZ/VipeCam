import { requireAdmin } from "@/lib/auth";
import { getSettings } from "@/services/catalog";
import { SettingsEditor } from "@/components/admin/settings-editor";
export default async function Page() {
  await requireAdmin();
  return (
    <>
      <div className="admin-heading">
        <h1>Cài đặt cửa hàng</h1>
      </div>
      <SettingsEditor record={await getSettings()} />
    </>
  );
}
