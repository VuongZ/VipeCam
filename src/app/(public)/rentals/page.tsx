import { requireUser } from "@/lib/auth";
import { getRentals } from "@/services/booking";
import { RentalHistory } from "@/components/rental/history";
export const metadata = { title: "Đơn thuê của tôi", robots: { index: false } };
export default async function Rentals() {
  const user = await requireUser();
  const rentals = await getRentals(user.id);
  return (
    <div className="container page-space">
      <span className="eyebrow">MỌI CHUYẾN ĐI, MỘT NƠI</span>
      <h1>Đơn thuê của tôi</h1>
      <RentalHistory rentals={rentals} />
    </div>
  );
}
