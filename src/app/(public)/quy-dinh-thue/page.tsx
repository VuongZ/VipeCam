import { getRentalPolicies } from "@/services/catalog";
import { RentalPolicyGallery } from "@/components/rental-policy-gallery";
export const metadata = { title: "Quy định thuê máy" };
export default async function RentalPolicyPage() {
  const rows = await getRentalPolicies();
  return (
    <div className="container page-space rental-policy-page">
      <h1>Quy định thuê máy</h1>
      <RentalPolicyGallery rows={rows} />
    </div>
  );
}
