import Link from "next/link";
export default function NotFound() {
  return (
    <main id="main-content" className="container page-space empty-state">
      <h1>Không tìm thấy trang</h1>
      <p>Thiết bị hoặc trang này có thể đã được ẩn.</p>
      <Link href="/cameras" className="button button-primary">
        Khám phá thiết bị
      </Link>
    </main>
  );
}
