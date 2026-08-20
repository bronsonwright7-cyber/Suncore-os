import { notFound } from "next/navigation";
import { PropertyForm } from "@/components/properties/property-form";
import { getProperty } from "@/server/properties/queries";

export default async function EditPropertyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const property = await getProperty(id);

  if (!property) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-foreground text-lg font-semibold">Edit {property.address_line1}</h1>
      </div>
      <PropertyForm
        property={property}
        defaultCustomerLabel={
          property.customer
            ? `${property.customer.first_name} ${property.customer.last_name}`
            : undefined
        }
      />
    </div>
  );
}
