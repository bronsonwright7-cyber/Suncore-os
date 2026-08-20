import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ToggleActiveButton } from "@/components/forms/toggle-active-button";
import { getEmployee, listEmployeeCrews } from "@/server/employees/queries";
import { setEmployeeActive } from "@/server/employees/actions";
import { getCurrentUserWithProfile } from "@/server/auth/current-user";
import { canManageCore } from "@/lib/permissions";
import { formatDateOnly } from "@/lib/format";

export default async function EmployeeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [employee, crews, session] = await Promise.all([
    getEmployee(id),
    listEmployeeCrews(id),
    getCurrentUserWithProfile(),
  ]);

  if (!employee) {
    notFound();
  }

  const canManage = canManageCore(session?.profile?.role ?? null);
  const currentCrews = crews.filter((membership) => membership.end_date === null);
  const pastCrews = crews.filter((membership) => membership.end_date !== null);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-foreground text-lg font-semibold">
              {employee.first_name} {employee.last_name}
            </h1>
            <p className="text-muted-foreground text-sm">{employee.job_title ?? "Employee"}</p>
          </div>
          <Badge variant={employee.is_active ? "default" : "secondary"}>
            {employee.is_active ? "Active" : "Inactive"}
          </Badge>
        </div>
        {canManage ? (
          <div className="flex gap-2">
            <ToggleActiveButton
              id={employee.id}
              isActive={employee.is_active}
              action={setEmployeeActive}
            />
            <Button variant="outline" asChild>
              <Link href={`/dashboard/employees/${employee.id}/edit`}>
                <Pencil className="size-4" />
                Edit
              </Link>
            </Button>
          </div>
        ) : null}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Details</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
          <div>
            <p className="text-muted-foreground">Phone</p>
            <p>{employee.phone ?? "—"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Email</p>
            <p>{employee.email ?? "—"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Employee type</p>
            <p>{employee.employee_type}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Login access</p>
            <p>{employee.profile_id ? "Linked" : "No login linked yet"}</p>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3">
        <h2 className="text-foreground text-base font-semibold">Crew membership</h2>
        {currentCrews.length === 0 ? (
          <p className="text-muted-foreground text-sm">Not currently on a crew.</p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {currentCrews.map((membership) => (
              <Link key={membership.id} href={`/dashboard/crews/${membership.crew?.id}`}>
                <Card className="hover:border-primary/50 transition-colors">
                  <CardContent className="text-sm">
                    <p className="font-medium">{membership.crew?.name ?? "—"}</p>
                    <p className="text-muted-foreground">
                      {membership.role_in_crew} since {formatDateOnly(membership.start_date)}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
        {pastCrews.length > 0 ? (
          <p className="text-muted-foreground text-xs">
            Also previously on:{" "}
            {pastCrews
              .map((m) => m.crew?.name)
              .filter(Boolean)
              .join(", ")}
          </p>
        ) : null}
      </div>
    </div>
  );
}
