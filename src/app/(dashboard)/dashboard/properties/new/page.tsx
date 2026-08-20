import { PropertyForm } from "@/components/properties/property-form";
import { getCustomer } from "@/server/customers/queries";

export default async function NewPropertyPage({
  searchParams,
}: {
  searchParams: Promise<{ customerId?: string }>;
}) {
  const { customerId } = await searchParams;
  const customer = customerId ? await getCustomer(customerId) : null;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-foreground text-lg font-semibold">New Property</h1>
      </div>
      <PropertyForm
        defaultCustomerId={customer?.id}
        defaultCustomerLabel={customer ? `${customer.first_name} ${customer.last_name}` : undefined}
      />
    </div>
  );
}
