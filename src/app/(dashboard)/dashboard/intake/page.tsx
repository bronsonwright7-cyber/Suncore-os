import { redirect } from "next/navigation";
import { getCurrentUserWithProfile } from "@/server/auth/current-user";
import { canManageCore } from "@/lib/permissions";
import { IntakeWorkflow } from "@/components/intake/intake-workflow";

export default async function IntakePage() {
  const session = await getCurrentUserWithProfile();
  const role = session?.profile?.role ?? null;

  // The (dashboard) layout already redirects crew and no-role accounts away,
  // but AI Intake creates customers/properties/jobs, so it needs the same
  // role check as every other "New X" action (canManageCore), not just
  // broad read access. Defense-in-depth only: the real boundary is RLS on
  // every insert this page's Server Actions eventually make.
  if (!session || !canManageCore(role)) {
    redirect("/dashboard");
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-foreground text-lg font-semibold">AI Intake</h1>
        <p className="text-muted-foreground text-sm">
          Paste unstructured client/job notes and Suncore AI will extract them into a customer,
          property, solar system, and job for you to review before anything is created.
        </p>
      </div>
      <IntakeWorkflow />
    </div>
  );
}
