export default function Loading() {
  return (
    <div
      className="container page-space"
      role="status"
      aria-label="Đang tải"
      aria-busy="true"
    >
      <div className="skeleton h-12 w-2/3 mb-8" />
      <div className="skeleton h-72 mb-8" />
      <div className="camera-grid">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="skeleton h-72" />
        ))}
      </div>
    </div>
  );
}
