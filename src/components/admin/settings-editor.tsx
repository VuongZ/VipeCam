"use client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { settingsFields } from "@/lib/admin-resources";
import { saveSettings } from "@/actions/admin";
import { Editor, type AdminRecord } from "./editor";
export function SettingsEditor({ record }: { record: AdminRecord }) {
  const router = useRouter();
  return (
    <div className="panel max-w-3xl">
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
