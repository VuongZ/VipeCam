"use client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { settingsFields } from "@/lib/admin-resources";
import { saveSettings } from "@/actions/admin";
import { Editor, type AdminRecord } from "./editor";
import { BrandLogo } from "@/components/layout/brand-logo";
export function SettingsEditor({ record }: { record: AdminRecord }) {
  const router = useRouter();
  return (
    <div className="panel max-w-3xl">
      <div className="mb-6">
        <p className="text-sm font-semibold mb-2">Logo thương hiệu</p>
        <BrandLogo />
      </div>
      <Editor
        fields={settingsFields}
        record={record}
        choices={{ cameras: [], categories: [] }}
        resource="settings"
        onSave={async (data) => {
          const result = await saveSettings(data);
          if (!result.error) {
            toast.success("Đã cập nhật cài đặt.");
            router.refresh();
          }
          return result;
        }}
      />
    </div>
  );
}
