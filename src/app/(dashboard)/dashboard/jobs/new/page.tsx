import { JobForm } from "@/components/jobs/job-form";
import { listActiveJobTypes, listActiveCrewsForFilter } from "@/server/jobs/queries";
import { listActivePartnersForSelect } from "@/server/partners/queries";
import { getProperty } from "@/server/properties/queries";

export default async function NewJobPage({
  searchParams,
}: {
  searchParams: Promise<{ propertyId?: string }>;
}) {
  const { propertyId } = await searchParams;
  const [jobTypes, partners, crews, property] = await Promise.all([
    listActiveJobTypes(),
    listActivePartnersForSelect(),
    listActiveCrewsForFilter(),
    propertyId ? getProperty(propertyId) : null,
  ]);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-foreground text-lg font-semibold">New Job</h1>
      </div>
      <JobForm
        jobTypes={jobTypes}
        partners={partners}
        crews={crews}
        defaultPropertyId={property?.id}
        defaultPropertyLabel={property?.address_line1}
        defaultCustomerId={property?.customer?.id}
        defaultCustomerLabel={
          property?.customer
            ? `${property.customer.first_name} ${property.customer.last_name}`
            : undefined
        }
      />
    </div>
  );
}
