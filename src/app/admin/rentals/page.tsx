import { requireAdmin } from "@/lib/auth";
import { getRentals } from "@/services/booking";
import { RentalsManager } from "@/components/admin/rentals-manager";
export default async function Page() {
  await requireAdmin();
  return <RentalsManager rentals={await getRentals()} />;
}
