import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getProperty, listPropertySolarSystems } from "@/server/properties/queries";
import { listPropertyJobs } from "@/server/jobs/queries";
import { getCurrentUserWithProfile } from "@/server/auth/current-user";
import { canManageCore } from "@/lib/permissions";
import { formatDateOnly } from "@/lib/format";
import { JobStatusBadge } from "@/components/jobs/job-status-badge";

export default async function PropertyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [property, solarSystems, jobs, session] = await Promise.all([
    getProperty(id),
    listPropertySolarSystems(id),
    listPropertyJobs(id),
    getCurrentUserWithProfile(),
  ]);

  if (!property) {
    notFound();
  }

  const canManage = canManageCore(session?.profile?.role ?? null);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-foreground text-lg font-semibold">{property.address_line1}</h1>
          <p className="text-muted-foreground text-sm">
            {property.city}, {property.state} {property.postal_code}
          </p>
        </div>
        {canManage ? (
          <Button variant="outline" asChild>
            <Link href={`/dashboard/properties/${property.id}/edit`}>
              <Pencil className="size-4" />
              Edit
            </Link>
          </Button>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Address</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
            <div className="sm:col-span-2">
              <p className="text-muted-foreground">Street</p>
              <p>
                {property.address_line1}
                {property.address_line2 ? `, ${property.address_line2}` : ""}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">City / State</p>
              <p>
                {property.city}, {property.state}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Postal code</p>
              <p>{property.postal_code}</p>
            </div>
            {property.notes ? (
              <div className="sm:col-span-2">
                <p className="text-muted-foreground">Notes</p>
                <p className="whitespace-pre-wrap">{property.notes}</p>
              </div>
            ) : null}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Customer</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            {property.customer ? (
              <Link
                href={`/dashboard/customers/${property.customer.id}`}
                className="hover:underline"
              >
                {property.customer.first_name} {property.customer.last_name}
              </Link>
            ) : (
              "—"
            )}
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-foreground text-base font-semibold">Solar Systems</h2>
          {canManage ? (
            <Button variant="outline" size="sm" asChild>
              <Link href={`/dashboard/solar-systems/new?propertyId=${property.id}`}>
                <Plus className="size-4" />
                Add Solar System
              </Link>
            </Button>
          ) : null}
        </div>
        {solarSystems.length === 0 ? (
          <p className="text-muted-foreground text-sm">No solar systems on file yet.</p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {solarSystems.map((system) => (
              <Link key={system.id} href={`/dashboard/solar-systems/${system.id}`}>
                <Card className="hover:border-primary/50 transition-colors">
                  <CardContent className="text-sm">
                    <p className="font-medium">
                      {system.system_size_kw ? `${system.system_size_kw} kW` : "Solar system"}
                      {system.panel_manufacturer ? ` · ${system.panel_manufacturer}` : ""}
                    </p>
                    <p className="text-muted-foreground">
                      {system.install_date
                        ? `Installed ${formatDateOnly(system.install_date)}`
                        : "Install date not set"}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-foreground text-base font-semibold">Jobs</h2>
          {canManage ? (
            <Button variant="outline" size="sm" asChild>
              <Link href={`/dashboard/jobs/new?propertyId=${property.id}`}>
                <Plus className="size-4" />
                New Job
              </Link>
            </Button>
          ) : null}
        </div>
        {jobs.length === 0 ? (
          <p className="text-muted-foreground text-sm">No jobs on file yet.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {jobs.map((job) => (
              <Link key={job.id} href={`/dashboard/jobs/${job.id}`}>
                <Card className="hover:border-primary/50 transition-colors">
                  <CardContent className="flex items-center justify-between text-sm">
                    <div>
                      <p className="font-medium">{job.title}</p>
                      <p className="text-muted-foreground">
                        Job #{job.job_number} · {formatDateOnly(job.appointment_date)}
                      </p>
                    </div>
                    <JobStatusBadge status={job.status} />
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
