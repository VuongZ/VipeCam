# VipeCam

Ứng dụng cho thuê máy ảnh tiếng Việt: Next.js App Router, TypeScript, Tailwind CSS, các primitive shadcn/ui dùng Radix, PostgreSQL, Drizzle ORM, Better Auth và kho ảnh local/R2. Một ứng dụng đơn khối; không dùng MongoDB, Redis hay microservices.

## Khởi động

Yêu cầu Node.js 22.14+ hoặc 24 LTS, pnpm 11 và PostgreSQL 16+.

```sh
git clone <URL-repository-cua-ban> VipeCam
cd VipeCam
pnpm install
cp .env.example .env.local
```

PowerShell: dùng `Copy-Item .env.example .env.local`. Không ghi đè tệp môi trường đang có.

Điền chuỗi kết nối Neon PostgreSQL vào `DATABASE_URL` trong `.env.local`. Không đưa URL hoặc mật khẩu vào mã nguồn, không dùng tiền tố `NEXT_PUBLIC_`. `src/db/index.ts` có bảo vệ `server-only`, dùng `@neondatabase/serverless` và `drizzle-orm/neon-serverless`. Kết nối WebSocket hỗ trợ giao dịch và khóa hàng khi xác nhận đơn thuê. Node.js 22+ cung cấp WebSocket tích hợp. Chỉ database kiểm thử trên localhost dùng driver TCP `pg`.

Ví dụ với PostgreSQL đã cài:

```sh
createuser --pwprompt vipecam
createdb --owner=vipecam vipecam
```

Tạo secret bằng `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`, lưu vào `BETTER_AUTH_SECRET`. Cấu hình `BETTER_AUTH_URL` và `NEXT_PUBLIC_APP_URL` cùng origin, ví dụ `http://localhost:3000`. Luôn truy cập bằng đúng hostname đó để cookie, kiểm tra Origin và upload hoạt động thống nhất.

```sh
pnpm db:migrate
pnpm db:seed
pnpm db:check
pnpm dev
```

Mở <http://localhost:3000>. `.env.local` có ưu tiên cao hơn `.env` ở cả Next.js và các lệnh database. Biến môi trường của tiến trình có ưu tiên cao nhất. Khi dùng database của tổ chức hoặc database dùng chung, chỉ chạy migration/seed khi được phép.

Seed có thể chạy lại: thêm các bản ghi mẫu còn thiếu, không ghi đè nội dung đã sửa. Gồm 7 danh mục, 4 máy ảnh, 4 mức giá mỗi máy, 2 banner, 3 feedback mẫu và cài đặt cửa hàng. Ảnh là placeholder minh họa, không cam kết đúng model; feedback được gắn nhãn mẫu. Thay ảnh, feedback, thông tin liên hệ, tiền cọc và chính sách trong Admin trước khi đưa vào vận hành.

## Tạo tài khoản quản trị

Không có tài khoản hoặc mật khẩu quản trị mặc định. Thiết lập `ADMIN_EMAIL`, `ADMIN_NAME`, `ADMIN_PASSWORD` trong môi trường local riêng hoặc secret của tiến trình, rồi chạy:

```sh
pnpm admin:create
```

Mật khẩu cần ít nhất 12 ký tự. Script tạo user ADMIN và credential với mật khẩu được băm bằng cơ chế của Better Auth trong một giao dịch. Nếu email đã tồn tại, script từ chối để tránh nâng quyền nhầm người. Sau khi tạo, xóa `ADMIN_PASSWORD` khỏi tệp môi trường; đăng nhập tại `/login`, truy cập `/admin`. Tài khoản đăng ký công khai luôn là CUSTOMER, client không được tự đặt role.

## Cấu trúc

```text
src/app/(public)/       Trang chủ, danh sách, chi tiết, tài khoản, lịch sử
src/app/admin/          Tổng quan, CRUD, đơn thuê, người dùng, cài đặt
src/app/api/            Better Auth, kiểm tra lịch trống, upload
src/components/ui/     Button, Sheet và xác nhận xóa dùng Radix/shadcn
src/components/        Giao diện theo tính năng
src/actions/           Server Actions có kiểm tra quyền và Zod
src/services/          Catalog, booking, storage
src/db/schema.ts       Schema Drizzle, khóa ngoại, index, CHECK
src/db/migrations/     SQL migrations và metadata Drizzle
src/db/seed.ts         Dữ liệu development
src/validators/        Validation dùng chung client/server
tests/                 Kiểm thử logic và PostgreSQL đồng thời
scripts/               Tạo admin và kiểm thử trình duyệt
```

Các trang và thao tác Admin đều kiểm tra session ở server. Dữ liệu tài khoản, lịch sử thuê được lọc theo user đăng nhập. Server Actions tự kiểm tra quyền, không dựa vào việc nút có xuất hiện trên UI hay không. Trang người dùng chỉ trả thông tin hồ sơ, không trả hash, token hoặc session. Nội dung là văn bản thuần, không render HTML từ database.

## Quy tắc đặt thuê

- Ngày nhận và trả theo lịch Việt Nam, tính cả hai đầu. Một ngày nhận/trả cùng ngày là gói 1 ngày.
- Khoảng ngày phải khớp `durationDays` của gói đang hoạt động. Giá gói là giá cả khoảng thuê, không nhân thêm số ngày.
- Kiểm tra overlap: `existing.startDate <= selectedEndDate AND existing.endDate >= selectedStartDate`.
- Chỉ CONFIRMED và RENTING chiếm tồn kho. PENDING là yêu cầu, chưa giữ máy; giao diện giải thích rõ điều này.
- Khóa hàng máy ảnh bằng `SELECT ... FOR UPDATE` trong giao dịch khi đặt và khi xác nhận. Hai xác nhận tranh máy cuối không thể cùng thành công. Với đơn nhiều thiết bị, khóa theo thứ tự ID ổn định.
- Máy inactive, bảo trì, hết số lượng hoặc gói giá tắt không được đặt. Server tính lại tiền thuê, cọc, tổng tiền từ database, bỏ qua giá do client gửi.
- Lưu snapshot tên thiết bị, tên gói và giá trong rental_items. Sửa giá sau này không thay đổi đơn cũ. Xóa giá giữ snapshot, khóa ngoại chuyển sang null; không xóa thiết bị đã gắn đơn.
- Luồng trạng thái: PENDING → CONFIRMED → RENTING → COMPLETED. Có thể hủy PENDING hoặc CONFIRMED. Không hồi sinh đơn đã hủy/hoàn thành; không bàn giao sớm hơn ngày nhận hoặc xác nhận đơn đã hết hạn.
- Doanh thu dashboard = subtotal của các đơn COMPLETED, không cộng cọc. Số máy giữ lịch hôm nay tính đơn CONFIRMED/RENTING đang phủ ngày hiện tại.
- Theo quy tắc yêu cầu, tồn kho trừ tổng số lượng của mọi đơn giao nhau. Đây là cách tính bảo thủ: hai đơn không giao nhau nhưng đều giao khoảng ngày khách chọn vẫn cùng được trừ. Điều này có thể từ chối một khoảng thuê dài còn đủ máy theo từng ngày.
- Mỗi khách tối đa 10 đơn PENDING; đăng nhập/đăng ký có rate limit lưu PostgreSQL. Chưa có thanh toán trực tuyến; nhận tiền và hoàn cọc được xử lý khi cửa hàng bàn giao/nhận máy.

## Quản trị

`/admin/cameras`: tìm, lọc hãng qua tìm kiếm, danh mục, trạng thái; thêm/sửa/xóa và bật/tắt thiết bị. Liên kết Ảnh/Giá thuê mở danh sách đã lọc theo thiết bị. Không giảm tồn kho hoặc ngừng thiết bị khi ảnh hưởng các đơn đã xác nhận.

`/admin/images`: upload ảnh hoặc dùng URL HTTPS, chọn ảnh chính, đổi thứ tự. Chỉ có một ảnh chính trên mỗi máy, đảm bảo bởi unique index và giao dịch.

`/admin/prices`, `/admin/categories`, `/admin/banners`, `/admin/feedbacks`: CRUD, thứ tự và trạng thái theo từng loại. Mọi nút xóa có hộp thoại xác nhận. Feedback public chỉ đọc isVisible=true; featured được ưu tiên.

`/admin/rentals`: tìm mã đơn/khách/thiết bị, lọc trạng thái, xem chi tiết, xác nhận/bàn giao/hoàn thành/hủy. Không sửa tiền trực tiếp trên đơn đã đặt.

`/admin/settings`: tên, logo, liên hệ, địa chỉ, hướng dẫn cọc, chính sách, điều khoản, giới thiệu và footer. `/admin/users`: xem và tìm khách hàng/quản trị viên. Cấp role ADMIN qua script vận hành, không qua form public.

## Kho ảnh

Development: `STORAGE_DRIVER=local`, upload vào `public/uploads/` (được gitignore). Ảnh seed có sẵn trong repository, không cần R2.

Production: `STORAGE_DRIVER=r2`; cung cấp `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_URL`. Tạo bucket và public custom domain trước khi dùng. API S3 của R2 nhận byte từ server, credential không xuất hiện ở client. Tài khoản R2 chỉ cần quyền trên bucket đó.

Chỉ ADMIN được upload, giới hạn 5 MB, chỉ JPEG/PNG/WebP; kiểm tra MIME và chữ ký file, tên file ngẫu nhiên, kiểm tra Origin. Không nhận SVG/HTML. Local upload bị vô hiệu hóa ở production. Xóa bản ghi ảnh không xóa object ngay để tránh làm hỏng URL đang được banner hoặc nội dung khác sử dụng; xử lý dọn object không dùng trong quy trình vận hành kho ảnh.

## Kiểm tra

```sh
pnpm lint
pnpm typecheck
pnpm build
```

Kiểm thử PostgreSQL cần database **local riêng**, đã migrate. Đặt `TEST_DATABASE_URL` trong `.env.local`; test luôn từ chối hosted và không dùng `DATABASE_URL` của Neon. Khi chạy ứng dụng để kiểm thử trình duyệt, đặt biến `DATABASE_URL` của tiến trình bằng `TEST_DATABASE_URL`:

```sh
pnpm test
```

Kiểm thử trình duyệt cần Microsoft Edge, server local đang chạy và cùng database:

```sh
node scripts/e2e.mjs
node scripts/admin-check.mjs
```

Biến `TEST_BASE_URL` (mặc định localhost:3000) và `TEST_DATABASE_URL` cấu hình dịch vụ test. Script tạo tài khoản ngẫu nhiên, đặt thuê, chạy quản trị, kiểm tra upload, rồi xóa dữ liệu test. Không chạy vào database production. `scripts/review-check.mjs` kiểm tra lỗi mạng, ảnh hỏng, thu hồi quyền quản trị và giao diện 320–1920px; script này cần production build và mặc định dùng localhost:3001. Báo cáo và ảnh ở `.local/`.

## Build và chạy production Node

```sh
pnpm install --frozen-lockfile
pnpm build
pnpm start
```

Đặt database, origin HTTPS, secret mạnh và R2 cho môi trường production. Đặt ứng dụng sau reverse proxy HTTPS. Windows dùng build tiêu chuẩn và `pnpm start` vì symlink của gói standalone với pnpm không hoạt động trên máy này. Linux dùng `output: standalone`; khi đóng gói, sao chép `public` và `.next/static` vào thư mục tương ứng rồi chạy `node .next/standalone/server.js`. Migration được chạy riêng trước khi cập nhật ứng dụng. Không tự chạy seed mỗi lần deploy. Sao lưu và diễn tập phục hồi PostgreSQL trước các thay đổi schema.

## Cloudflare Workers

Dự án có OpenNext config và `wrangler.jsonc`, `nodejs_compat`, assets binding. Tham khảo [OpenNext setup](https://opennext.js.org/cloudflare/get-started) và [Cloudflare PostgreSQL/Hyperdrive](https://developers.cloudflare.com/hyperdrive/examples/connect-to-postgres/postgres-drivers-and-libraries/node-postgres/).

Ưu tiên build trên Linux hoặc WSL; OpenNext hiện cảnh báo hỗ trợ Windows chưa đầy đủ. Node build không đồng nghĩa Worker build đã được xác nhận.

1. Đăng nhập Cloudflare bằng `pnpm exec wrangler login`.
2. Đặt secret `DATABASE_URL` bằng chuỗi kết nối Neon. Ứng dụng dùng Neon serverless qua WebSocket, không cần binding Hyperdrive.
3. Tạo bucket R2 và URL public; đặt STORAGE_DRIVER=r2.
4. Dùng `pnpm exec wrangler secret put <TEN_BIEN>` để lưu DATABASE_URL, BETTER_AUTH_SECRET và R2 credentials. Các giá trị không bí mật như origin và STORAGE_DRIVER có thể đặt trong `vars`. `NEXT_PUBLIC_APP_URL` phải được đặt đúng lúc build và trong runtime.
5. Chạy migration trên database đích đã được phép; seed demo chỉ khi muốn dữ liệu mẫu.
6. `pnpm build:cloudflare`, `pnpm preview:cloudflare`, kiểm tra đăng nhập, đặt thuê và upload, rồi `pnpm deploy:cloudflare`.

Pool Neon trên Node được dùng lại; trên Workers tạo pool riêng theo request và đóng bằng `after()` để không dùng socket từ request trước. Không giữ cache dữ liệu giá/lịch thuê. Chưa cấu hình Cloudflare account, domain, bucket hoặc secret thực tế trong repository.

Kết quả tại máy Windows hiện tại: `pnpm build` thành công; `pnpm build:cloudflare` bị lỗi đóng gói symlink và module `cloudflare:sockets` trên Windows, chưa tạo được Worker đã kiểm chứng. Có workflow Linux trong `.github/workflows/ci.yml` để chạy lại toàn bộ kiểm tra và Worker build khi đẩy repository. Workflow này chưa được chạy từ môi trường hiện tại; không xem cấu hình Cloudflare là một deployment đã hoàn tất.

## SEO và PWA

Metadata từng thiết bị lấy tên, mô tả và ảnh từ database; có sitemap và robots. Manifest đọc shopName từ settings, theme-color #EC4899, icon PNG 192/512. Service worker chỉ lưu trang offline và icon; không cache HTML tài khoản, API, giá hoặc lịch thuê. HTTPS và điều kiện riêng của trình duyệt quyết định khả năng cài đặt.

## Ghi chú môi trường phát triển hiện tại

PostgreSQL kiểm thử riêng nằm tại `.local/postgres`, chỉ lắng nghe 127.0.0.1:55432. Cluster này dùng trust cho localhost để phục vụ kiểm thử, không được đưa lên production. Nếu cần dừng, dùng `pg_ctl -D .local/postgres stop`. Không commit thư mục `.local`, `.env`, `.env.local`, `.dev.vars`, `.next`, `.open-next`, uploads hoặc secret.

Ảnh placeholder: [Vignesh Chandran / Unsplash](https://unsplash.com/photos/a-camera-sitting-on-top-of-a-black-table-U9gfkBQsHBs), tải từ nguồn ảnh Unsplash. Dùng để minh họa giao diện development, thay bằng ảnh kho thiết bị thực tế trong Admin.
