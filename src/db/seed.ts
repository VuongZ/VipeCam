import "../lib/load-env";
import { db, closeDatabase } from "./index";
import {
  banners,
  cameras,
  cameraImages,
  categories,
  feedbacks,
  rentalPrices,
  settings,
} from "./schema";
import { eq } from "drizzle-orm";
async function main() {
  await db.transaction(async (tx) => {
    await tx
      .insert(settings)
      .values({
        id: "shop",
        shopName: "VipeCam",
        about:
          "Thiết bị tốt. Khoảnh khắc của bạn. Chọn máy ảnh phù hợp cho chuyến đi, buổi chụp và những câu chuyện sắp kể.",
        phone: "",
        address: "",
        defaultDepositText:
          "Tiền cọc được hoàn lại khi trả thiết bị đủ phụ kiện và đúng tình trạng bàn giao.",
        rentalPolicy:
          "Ngày nhận và ngày trả đều được tính vào thời gian thuê. Đơn chỉ giữ thiết bị sau khi cửa hàng xác nhận. Mang giấy tờ tùy thân khi nhận máy và kiểm tra đầy đủ phụ kiện cùng nhân viên. Liên hệ cửa hàng trước ngày trả nếu cần gia hạn.",
        terms:
          "Giá thuê chưa bao gồm các dịch vụ phát sinh ngoài đơn. Tiền cọc được ghi riêng và hoàn sau khi kiểm tra thiết bị. Không tự ý tháo máy hoặc chuyển thiết bị cho bên thứ ba. Chính sách bồi thường sẽ được thống nhất trong biên bản bàn giao.",
        footerText: "Giữ trọn từng khoảnh khắc.",
      })
      .onConflictDoNothing();
    const cats = [
      ["Máy ảnh", "may-anh", "Camera"],
      ["Lens", "lens", "Aperture"],
      ["Đèn", "den", "Lightbulb"],
      ["Gimbal", "gimbal", "Focus"],
      ["Microphone", "microphone", "Mic"],
      ["Tripod", "tripod", "Triangle"],
      ["Phụ kiện", "phu-kien", "Package"],
    ];
    for (const [i, c] of cats.entries())
      await tx
        .insert(categories)
        .values({ name: c[0], slug: c[1], icon: c[2], displayOrder: i })
        .onConflictDoNothing();
    const [category] = await tx
      .select()
      .from(categories)
      .where(eq(categories.slug, "may-anh"));
    const products = [
      {
        name: "Sony A7 IV",
        slug: "sony-a7-iv",
        brand: "Sony",
        model: "ILCE-7M4",
        daily: 500000,
        deposit: 10000000,
        shortDescription: "Full-frame 33MP · Video 4K 60p",
        specifications: {
          "Cảm biến": "Full-frame CMOS 33MP",
          Video: "4K 60p",
          Ngàm: "Sony E",
          "Chống rung": "5 trục",
        },
      },
      {
        name: "Canon EOS R6 Mark II",
        slug: "canon-eos-r6-mark-ii",
        brand: "Canon",
        model: "EOS R6 Mark II",
        daily: 550000,
        deposit: 10000000,
        shortDescription: "Full-frame 24.2MP · Lấy nét thông minh",
        specifications: {
          "Cảm biến": "Full-frame CMOS 24.2MP",
          Video: "4K 60p",
          Ngàm: "Canon RF",
          "Chống rung": "Trong thân máy",
        },
      },
      {
        name: "Sony A7 III",
        slug: "sony-a7-iii",
        brand: "Sony",
        model: "ILCE-7M3",
        daily: 350000,
        deposit: 7000000,
        shortDescription: "Full-frame 24.2MP · Gọn nhẹ, đa dụng",
        specifications: {
          "Cảm biến": "Full-frame CMOS 24.2MP",
          Video: "4K 30p",
          Ngàm: "Sony E",
          "Chống rung": "5 trục",
        },
      },
      {
        name: "Fujifilm X-T5",
        slug: "fujifilm-x-t5",
        brand: "Fujifilm",
        model: "X-T5",
        daily: 450000,
        deposit: 8000000,
        shortDescription: "APS-C 40.2MP · Màu phim đầy cảm hứng",
        specifications: {
          "Cảm biến": "APS-C X-Trans 40.2MP",
          Video: "6.2K 30p",
          Ngàm: "Fujifilm X",
          "Chống rung": "5 trục",
        },
      },
    ];
    for (const p of products) {
      const [camera] = await tx
        .insert(cameras)
        .values({
          name: p.name,
          slug: p.slug,
          brand: p.brand,
          model: p.model,
          shortDescription: p.shortDescription,
          specifications: p.specifications,
          deposit: p.deposit,
          description: `${p.name} dành cho những buổi chụp chân dung, du lịch và sáng tạo nội dung. Bộ thuê cơ bản gồm thân máy, pin, sạc và dây đeo. Lens thuê riêng. Cửa hàng hướng dẫn sử dụng khi bàn giao để bạn tự tin bắt đầu buổi chụp.`,
          categoryId: category.id,
          quantity: 3,
          isFeatured: true,
        })
        .onConflictDoNothing()
        .returning();
      if (!camera) continue;
      await tx.insert(cameraImages).values({
        cameraId: camera.id,
        imageUrl: "/images/camera-placeholder.webp",
        isPrimary: true,
      });
      for (const [i, days] of [1, 2, 3, 7].entries())
        await tx.insert(rentalPrices).values({
          cameraId: camera.id,
          name: `${days} ngày`,
          durationDays: days,
          price: Math.round(p.daily * [1, 1.8, 2.5, 5][i]),
          displayOrder: i,
        });
    }
    if (!(await tx.select({ id: banners.id }).from(banners).limit(1)).length)
      await tx.insert(banners).values([
        {
          title: "Chuyện của bạn.\nGóc nhìn của bạn.",
          subtitle:
            "Một chiếc máy ảnh tốt cho những điều đáng nhớ. Thuê linh hoạt, chọn đúng thiết bị bạn cần.",
          imageUrl: "/images/camera-placeholder.webp",
          buttonText: "Khám phá máy ảnh",
          linkUrl: "/cameras",
          displayOrder: 0,
        },
        {
          title: "Mang cảm hứng\nđi khắp nơi.",
          subtitle:
            "Từ một chuyến đi ngắn đến dự án cá nhân. Chọn lịch thuê phù hợp và bắt đầu sáng tạo.",
          imageUrl: "/images/camera-placeholder.webp",
          buttonText: "Chọn máy cho chuyến đi",
          linkUrl: "/cameras",
          displayOrder: 1,
        },
      ]);
    if (
      !(await tx.select({ id: feedbacks.id }).from(feedbacks).limit(1)).length
    )
      await tx.insert(feedbacks).values([
        {
          customerName: "Minh Anh · đánh giá mẫu",
          rating: 5,
          content:
            "Máy sạch, đầy đủ phụ kiện. Mình được hướng dẫn rất kỹ trước chuyến đi Đà Lạt.",
          isFeatured: true,
        },
        {
          customerName: "Hoàng Nam · đánh giá mẫu",
          rating: 5,
          content:
            "Đặt máy dễ dàng, giá rõ ràng. Sony A7 IV đáp ứng tốt buổi chụp của mình.",
          isFeatured: true,
        },
        {
          customerName: "Thảo Linh · đánh giá mẫu",
          rating: 5,
          content:
            "Lần đầu thuê máy mà rất yên tâm. Nhận và trả máy đều nhanh chóng.",
          isFeatured: true,
        },
      ]);
  });
  console.log(
    "Seed complete. Demo feedback is explicitly labeled; replace it before launch.",
  );
}
main()
  .catch(() => {
    console.error("Seed failed. Check database and migrations.");
    process.exitCode = 1;
  })
  .finally(closeDatabase);
