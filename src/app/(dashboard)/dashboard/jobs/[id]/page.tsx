import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { JobStatusBadge } from "@/components/jobs/job-status-badge";
import { JobPriorityBadge } from "@/components/jobs/job-priority-badge";
import { JobStatusActions } from "@/components/jobs/job-status-actions";
import { JobEventsTimeline } from "@/components/jobs/job-events-timeline";
import { getJob, listJobEvents, listAllowedNextStatuses } from "@/server/jobs/queries";
import { getCurrentUserWithProfile } from "@/server/auth/current-user";
import { canManageCore } from "@/lib/permissions";
import { formatDateOnly } from "@/lib/format";

export default async function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [job, session] = await Promise.all([getJob(id), getCurrentUserWithProfile()]);

  if (!job) {
    notFound();
  }

  const [events, allowedNextStatuses] = await Promise.all([
    listJobEvents(id),
    listAllowedNextStatuses(job.status),
  ]);

  const role = session?.profile?.role ?? null;
  const canManage = canManageCore(role);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-foreground text-lg font-semibold">{job.title}</h1>
            <JobStatusBadge status={job.status} />
            <JobPriorityBadge priority={job.priority} />
          </div>
          <p className="text-muted-foreground text-sm">
            Job #{job.job_number}
            {job.property?.customer ? (
              <>
                {" "}
                ·{" "}
                <Link
                  href={`/dashboard/customers/${job.property.customer.id}`}
                  className="hover:underline"
                >
                  {job.property.customer.first_name} {job.property.customer.last_name}
                </Link>
              </>
            ) : null}
            {job.property ? (
              <>
                {" "}
                ·{" "}
                <Link href={`/dashboard/properties/${job.property.id}`} className="hover:underline">
                  {job.property.address_line1}
                </Link>
              </>
            ) : null}
          </p>
        </div>
        {canManage ? (
          <Button variant="outline" asChild>
            <Link href={`/dashboard/jobs/${job.id}/edit`}>
              <Pencil className="size-4" />
              Edit
            </Link>
          </Button>
        ) : null}
      </div>

      <JobStatusActions
        jobId={job.id}
        currentStatus={job.status}
        allowedNextStatuses={allowedNextStatuses}
        role={role}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="flex flex-col gap-4 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Details</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
              <div>
                <p className="text-muted-foreground">Job type</p>
                <p>{job.job_type?.label ?? "—"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Source</p>
                <p>
                  {job.source ?? "—"}
                  {job.partner ? ` · ${job.partner.name}` : ""}
                </p>
              </div>
              {job.solar_system ? (
                <div>
                  <p className="text-muted-foreground">Solar system</p>
                  <Link
                    href={`/dashboard/solar-systems/${job.solar_system.id}`}
                    className="hover:underline"
                  >
                    {job.solar_system.system_size_kw
                      ? `${job.solar_system.system_size_kw} kW`
                      : "View system"}
                  </Link>
                </div>
              ) : null}
              {job.description ? (
                <div className="sm:col-span-2">
                  <p className="text-muted-foreground">Description</p>
                  <p className="whitespace-pre-wrap">{job.description}</p>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Scheduling &amp; Assignment</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
              <div>
                <p className="text-muted-foreground">Date</p>
                <p>{formatDateOnly(job.appointment_date)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Time</p>
                <p>
                  {job.appointment_start_time || job.appointment_end_time
                    ? `${job.appointment_start_time ?? "?"} – ${job.appointment_end_time ?? "?"}`
                    : (job.appointment_window ?? "—")}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Assigned crew</p>
                <p>
                  {job.assigned_crew ? (
                    <Link
                      href={`/dashboard/crews/${job.assigned_crew.id}`}
                      className="hover:underline"
                    >
                      {job.assigned_crew.name}
                    </Link>
                  ) : (
                    "Unassigned"
                  )}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Assigned lead/tech</p>
                <p>
                  {job.assigned_employee ? (
                    <Link
                      href={`/dashboard/employees/${job.assigned_employee.id}`}
                      className="hover:underline"
                    >
                      {job.assigned_employee.first_name} {job.assigned_employee.last_name}
                    </Link>
                  ) : (
                    "Unassigned"
                  )}
                </p>
              </div>
              {canManage && job.scheduling_notes ? (
                <div className="sm:col-span-2">
                  <p className="text-muted-foreground">Internal scheduling notes</p>
                  <p className="whitespace-pre-wrap">{job.scheduling_notes}</p>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <JobEventsTimeline events={events} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
