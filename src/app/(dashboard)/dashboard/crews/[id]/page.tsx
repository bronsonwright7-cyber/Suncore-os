import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ToggleActiveButton } from "@/components/forms/toggle-active-button";
import { AddCrewMemberForm } from "@/components/crews/add-crew-member-form";
import { EndMembershipButton } from "@/components/crews/end-membership-button";
import { getCrew, listCrewMembers } from "@/server/crews/queries";
import { setCrewActive } from "@/server/crews/actions";
import { getCurrentUserWithProfile } from "@/server/auth/current-user";
import { canManageCore } from "@/lib/permissions";
import { formatDateOnly } from "@/lib/format";

export default async function CrewDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [crew, members, session] = await Promise.all([
    getCrew(id),
    listCrewMembers(id),
    getCurrentUserWithProfile(),
  ]);

  if (!crew) {
    notFound();
  }

  const canManage = canManageCore(session?.profile?.role ?? null);
  const currentMembers = members.filter((m) => m.end_date === null);
  const pastMembers = members.filter((m) => m.end_date !== null);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-foreground text-lg font-semibold">{crew.name}</h1>
          <Badge variant={crew.is_active ? "default" : "secondary"}>
            {crew.is_active ? "Active" : "Inactive"}
          </Badge>
        </div>
        {canManage ? (
          <div className="flex gap-2">
            <ToggleActiveButton id={crew.id} isActive={crew.is_active} action={setCrewActive} />
            <Button variant="outline" asChild>
              <Link href={`/dashboard/crews/${crew.id}/edit`}>
                <Pencil className="size-4" />
                Edit
              </Link>
            </Button>
          </div>
        ) : null}
      </div>

      {crew.notes ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Notes</CardTitle>
          </CardHeader>
          <CardContent className="text-sm whitespace-pre-wrap">{crew.notes}</CardContent>
        </Card>
      ) : null}

      <div className="flex flex-col gap-3">
        <h2 className="text-foreground text-base font-semibold">Members</h2>

        {canManage ? <AddCrewMemberForm crewId={crew.id} /> : null}

        {currentMembers.length === 0 ? (
          <p className="text-muted-foreground text-sm">No current members.</p>
        ) : (
          <div className="border-border overflow-hidden rounded-md border">
            {currentMembers.map((member) => (
              <div
                key={member.id}
                className="border-border flex items-center justify-between border-b p-3 text-sm last:border-b-0"
              >
                <div>
                  <Link
                    href={`/dashboard/employees/${member.employee?.id}`}
                    className="font-medium hover:underline"
                  >
                    {member.employee?.first_name} {member.employee?.last_name}
                  </Link>
                  <p className="text-muted-foreground">
                    {member.role_in_crew} · since {formatDateOnly(member.start_date)}
                  </p>
                </div>
                {canManage ? (
                  <EndMembershipButton membershipId={member.id} crewId={crew.id} />
                ) : null}
              </div>
            ))}
          </div>
        )}

        {pastMembers.length > 0 ? (
          <details className="text-sm">
            <summary className="text-muted-foreground cursor-pointer">
              Past members ({pastMembers.length})
            </summary>
            <div className="mt-2 flex flex-col gap-1">
              {pastMembers.map((member) => (
                <p key={member.id} className="text-muted-foreground">
                  {member.employee?.first_name} {member.employee?.last_name} ·{" "}
                  {formatDateOnly(member.start_date)} –{" "}
                  {member.end_date ? formatDateOnly(member.end_date) : ""}
                </p>
              ))}
            </div>
          </details>
        ) : null}
      </div>
    </div>
  );
}
