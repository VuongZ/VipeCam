# Cập nhật máy ảnh, ảnh công thức và Zalo

## Phạm vi đã xác nhận

Mỗi mẫu máy có bộ **ảnh công thức/hướng dẫn chỉnh màu** do Admin tải lên. Không bổ sung biến thể màu thân máy, tồn kho theo màu hoặc đổi quy tắc đặt thuê.

## Chức năng

- Admin tải nhiều ảnh JPG/JPEG/PNG/WebP/GIF/BMP/HEIC/HEIF/AVIF/TIFF, chọn bằng file picker hoặc kéo thả. Tối đa 10 MB/ảnh, 40 megapixel và 12.000 pixel mỗi chiều. File được kiểm tra nội dung thực tế, giải mã, tự xoay theo metadata khi codec hỗ trợ và chuyển sang WebP. GIF/TIFF nhiều trang dùng ảnh đầu tiên. Ảnh cũ được giữ nguyên.
- Quản lý ảnh sản phẩm: xem trước, thay, xóa khỏi bộ ảnh, đổi thứ tự và chọn ảnh chính. Chỉ ghi thay đổi database khi bấm Lưu thay đổi. Không xóa object ảnh cũ để bảo vệ các nơi đang sử dụng URL.
- Quản lý bộ ảnh công thức riêng trong biểu mẫu máy ảnh: tải nhiều, kéo thả, thay/xóa/sắp xếp. Server kiểm tra quyền Admin và xác minh ID ảnh thuộc đúng máy; lưu trong giao dịch cùng máy ảnh.
- Trang chi tiết máy ảnh có mục Công thức chỉnh màu với ảnh thu nhỏ, mở lớn, cuộn ảnh dài và mở ảnh gốc. Bộ công thức không bị trộn vào ảnh sản phẩm.
- Public chỉ hiện danh mục có biểu tượng Camera. Bỏ các biểu tượng lens/đèn/gimbal/microphone/tripod/phụ kiện khỏi phần khám phá và lựa chọn biểu tượng mới trong Admin; không xóa danh mục hoặc dữ liệu cũ. Seed mới chỉ tạo danh mục Máy ảnh.
- Đăng ký yêu cầu số Zalo; validation ở client và backend Better Auth, chuẩn hóa đầu +84 thành 0. Tái sử dụng users.phone, không tạo dữ liệu trùng. Tài khoản cũ tiếp tục đăng nhập và bổ sung/cập nhật số trong hồ sơ. Admin tìm/xem số trong Người dùng và chi tiết đơn thuê. Không gửi tin nhắn Zalo.

## Database và chạy project

Migration: src/db/migrations/0006_camera_recipes.sql, thêm bảng camera_recipes với camera_id, image_url, display_order và timestamps; khóa ngoại cascade theo máy và index thứ tự. Không sửa/xóa dữ liệu ảnh sản phẩm, người dùng, đơn thuê hoặc reset database.

Migration đã được áp dụng vào database kiểm thử và database project cấu hình hiện tại. Database project có 7 migration; bảng công thức ban đầu rỗng để Admin tải nội dung thật. Không chạy seed trên database chính. Môi trường khác cần:

```powershell
pnpm install --frozen-lockfile
pnpm db:migrate
pnpm dev
```

Nếu chạy production, dùng pnpm build rồi pnpm start; upload production tiếp tục yêu cầu R2.

## Kiểm tra thực tế

- TypeScript: đạt.
- ESLint: đạt.
- Next.js production build: đạt; dùng output và database test riêng.
- 11 kiểm thử tự động: đạt (logic đặt thuê, tồn kho đồng thời, media, số Zalo, giải mã/chuyển đổi ảnh, chặn file giả và quyền sở hữu ảnh công thức).
- Edge headless: Admin thêm máy với JPG/TIFF/BMP/HEIC, xem trước và chọn ảnh chính; kéo thả/multi-select ảnh công thức; sửa/thay/đổi thứ tự/xóa và lưu lại đúng máy; ảnh sản phẩm vẫn còn.
- Edge mobile: đăng ký bằng +84, lưu số chuẩn, cập nhật hồ sơ, từ chối API thiếu/sai số; xem ảnh công thức/mở ảnh lớn; kiểm tra không tràn ngang tại 320, 390, 768 và 1440px.
- Đặt thuê thực tế từ tài khoản test thành công; Admin xem số Zalo trong Người dùng và chi tiết đơn thuê.
- Upload từ CUSTOMER trả 403; SVG giả JPG trả 400.
- HEIC mẫu thực tế từ libheif chuyển sang WebP 1280×854 thành công; HEIF dùng cùng bộ giải mã theo nội dung file. Các định dạng JPEG/PNG/WebP/GIF/AVIF/TIFF/BMP còn lại được kiểm tra bằng fixture tạo trong test.
- Kết quả trình duyệt: .local/camera-update-results.json; ảnh minh chứng trong .local/screenshots/camera-update-admin.png và camera-recipe-mobile.png. Các tài khoản, máy và đơn test được dọn khỏi database test sau kiểm tra.

## Giới hạn và việc chưa thực hiện

- Chưa deploy hoặc kiểm thử Cloudflare Workers. Đã kiểm thử upload trên Node local; chưa kiểm thử qua tunnel cloudflared trong lần cập nhật này. Workers không chạy sharp native; nhánh Worker dùng binding IMAGES, cần cấu hình riêng và kiểm chứng codec/giới hạn gói của Cloudflare. BMP/TIFF/AVIF đầu vào trên Workers chưa được xác nhận. Xem https://developers.cloudflare.com/images/get-started/limits/ và https://developers.cloudflare.com/images/optimization/binding/.
- Không tạo sẵn công thức cho từng máy: Admin cần tải ảnh nội dung thật.
- Không tự gửi tin nhắn Zalo và không xác minh số có đăng ký Zalo thực tế.
- Kiểm tra mobile dùng mô phỏng cảm ứng Edge; chưa có kiểm thử trên thiết bị iOS/Android vật lý.

## File sửa/tạo trong lần cập nhật này

- Database: src/db/schema.ts; src/db/migrations/0006_camera_recipes.sql; src/db/migrations/meta/0006_snapshot.json; src/db/migrations/meta/_journal.json; src/db/seed.ts.
- Upload: src/lib/image-formats.ts (mới); src/lib/upload-image.ts; src/services/normalize-image-node.ts (mới); src/services/normalize-image.ts (mới); src/app/api/upload/route.ts; src/components/admin/product-images.tsx.
- Công thức/Admin: src/services/camera-recipes.ts (mới); src/actions/admin.ts; src/components/admin/editor.tsx; src/app/admin/[resource]/page.tsx; src/services/catalog.ts; src/app/(public)/cameras/[slug]/page.tsx; src/components/rental-policy-gallery.tsx.
- Tài khoản/Zalo: src/validators/index.ts; src/lib/auth.ts; src/lib/auth-client.ts; src/components/auth-form.tsx; src/components/account-form.tsx; src/app/(public)/account/page.tsx; src/app/admin/users/page.tsx; src/components/admin/users-table.tsx; src/services/booking.ts; src/components/admin/rentals-manager.tsx.
- Giao diện máy ảnh: src/app/(public)/page.tsx; src/components/camera/catalog.tsx; src/lib/admin-resources.ts; src/app/globals.css.
- Thư viện/tài liệu/kiểm thử: package.json; pnpm-lock.yaml; README.md; docs/camera-updates.md (mới); tests/camera-updates.test.ts (mới); scripts/camera-updates-check.mjs (mới); scripts/check-db.ts; scripts/e2e.mjs; scripts/admin-check.mjs.

Repository đã có nhiều thay đổi trước khi bắt đầu yêu cầu này; danh sách trên chỉ mô tả phần được chỉnh trong lần này.
