import { notFound } from "next/navigation";
import { CrewForm } from "@/components/crews/crew-form";
import { getCrew } from "@/server/crews/queries";

export default async function EditCrewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const crew = await getCrew(id);

  if (!crew) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-foreground text-lg font-semibold">Edit {crew.name}</h1>
      </div>
      <CrewForm crew={crew} />
    </div>
  );
}
