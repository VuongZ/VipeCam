"use client";
import { Button } from "@/components/ui/button";
export default function ErrorPage({ retry }: { retry: () => void }) {
  return (
    <main id="main-content" className="container page-space">
      <div className="empty-state">
        <h1>Chưa tải được nội dung</h1>
        <p>Vui lòng thử lại sau ít phút.</p>
        <Button onClick={retry}>Thử lại</Button>
      </div>
    </main>
  );
}
