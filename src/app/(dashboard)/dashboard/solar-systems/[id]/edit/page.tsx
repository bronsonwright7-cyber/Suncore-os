import { notFound } from "next/navigation";
import { SolarSystemForm } from "@/components/solar-systems/solar-system-form";
import { getSolarSystem } from "@/server/solar-systems/queries";

export default async function EditSolarSystemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const system = await getSolarSystem(id);

  if (!system) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-foreground text-lg font-semibold">Edit Solar System</h1>
      </div>
      <SolarSystemForm solarSystem={system} defaultPropertyLabel={system.property?.address_line1} />
    </div>
  );
}
