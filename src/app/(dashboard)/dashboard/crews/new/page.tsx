import { CrewForm } from "@/components/crews/crew-form";

export default function NewCrewPage() {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-foreground text-lg font-semibold">New Crew</h1>
      </div>
      <CrewForm />
    </div>
  );
}
