import { SolarSystemForm } from "@/components/solar-systems/solar-system-form";
import { getProperty } from "@/server/properties/queries";

export default async function NewSolarSystemPage({
  searchParams,
}: {
  searchParams: Promise<{ propertyId?: string }>;
}) {
  const { propertyId } = await searchParams;
  const property = propertyId ? await getProperty(propertyId) : null;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-foreground text-lg font-semibold">New Solar System</h1>
      </div>
      <SolarSystemForm
        defaultPropertyId={property?.id}
        defaultPropertyLabel={property?.address_line1}
      />
    </div>
  );
}
