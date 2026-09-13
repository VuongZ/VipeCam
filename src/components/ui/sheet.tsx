"use client";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
export const Sheet = Dialog.Root;
export const SheetTrigger = Dialog.Trigger;
export const SheetTitle = Dialog.Title;
export const SheetDescription = Dialog.Description;
export function SheetContent({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Dialog.Portal>
      <Dialog.Overlay className="overlay" />
      <Dialog.Content className={cn("sheet-content", className)}>
        <Dialog.Close
          className="sheet-close button button-ghost button-icon"
          aria-label="Đóng"
        >
          <X size={20} />
        </Dialog.Close>
        {children}
      </Dialog.Content>
    </Dialog.Portal>
  );
}
