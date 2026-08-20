import { PartnerForm } from "@/components/partners/partner-form";

export default function NewPartnerPage() {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-foreground text-lg font-semibold">New Partner</h1>
      </div>
      <PartnerForm />
    </div>
  );
}
