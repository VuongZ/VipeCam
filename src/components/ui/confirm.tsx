"use client";
import * as Alert from "@radix-ui/react-alert-dialog";
import { Button } from "./button";
export function Confirm({
  children,
  onConfirm,
  title = "Xóa nội dung này?",
  description = "Thao tác này không thể hoàn tác. Dữ liệu đang được sử dụng trong đơn thuê sẽ được bảo vệ.",
}: {
  children: React.ReactNode;
  onConfirm: () => void;
  title?: string;
  description?: string;
}) {
  return (
    <Alert.Root>
      <Alert.Trigger asChild>{children}</Alert.Trigger>
      <Alert.Portal>
        <Alert.Overlay className="overlay" />
        <Alert.Content className="confirm-content">
          <Alert.Title className="text-xl font-semibold">{title}</Alert.Title>
          <Alert.Description className="mt-3 text-muted">
            {description}
          </Alert.Description>
          <div className="mt-6 flex justify-end gap-3">
            <Alert.Cancel asChild>
              <Button variant="outline">Quay lại</Button>
            </Alert.Cancel>
            <Alert.Action asChild>
              <Button variant="destructive" onClick={onConfirm}>
                Xác nhận
              </Button>
            </Alert.Action>
          </div>
        </Alert.Content>
      </Alert.Portal>
    </Alert.Root>
  );
}
