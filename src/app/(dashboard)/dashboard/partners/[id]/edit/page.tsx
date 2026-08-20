import { notFound } from "next/navigation";
import { PartnerForm } from "@/components/partners/partner-form";
import { getPartner } from "@/server/partners/queries";

export default async function EditPartnerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const partner = await getPartner(id);

  if (!partner) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-foreground text-lg font-semibold">Edit {partner.name}</h1>
      </div>
      <PartnerForm partner={partner} />
    </div>
  );
}
