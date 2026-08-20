import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSolarSystem } from "@/server/solar-systems/queries";
import { formatDateOnly } from "@/lib/format";
import { getCurrentUserWithProfile } from "@/server/auth/current-user";
import { canManageCore } from "@/lib/permissions";

export default async function SolarSystemDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [system, session] = await Promise.all([getSolarSystem(id), getCurrentUserWithProfile()]);

  if (!system) {
    notFound();
  }

  const canManage = canManageCore(session?.profile?.role ?? null);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-foreground text-lg font-semibold">
            {system.system_size_kw ? `${system.system_size_kw} kW Solar System` : "Solar System"}
          </h1>
          {system.property ? (
            <p className="text-muted-foreground text-sm">
              <Link
                href={`/dashboard/properties/${system.property.id}`}
                className="hover:underline"
              >
                {system.property.address_line1}, {system.property.city}, {system.property.state}
              </Link>
            </p>
          ) : null}
        </div>
        {canManage ? (
          <Button variant="outline" asChild>
            <Link href={`/dashboard/solar-systems/${system.id}/edit`}>
              <Pencil className="size-4" />
              Edit
            </Link>
          </Button>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Panels</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Count</p>
              <p>{system.panel_count ?? "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Manufacturer</p>
              <p>{system.panel_manufacturer ?? "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Model</p>
              <p>{system.panel_model ?? "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Install date</p>
              <p>{formatDateOnly(system.install_date)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Inverter &amp; monitoring</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Inverter manufacturer</p>
              <p>{system.inverter_manufacturer ?? "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Inverter model</p>
              <p>{system.inverter_model ?? "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Monitoring platform</p>
              <p>{system.monitoring_platform ?? "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Monitoring system ID</p>
              <p>{system.monitoring_system_id ?? "—"}</p>
            </div>
          </CardContent>
        </Card>
        {system.notes ? (
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Notes</CardTitle>
            </CardHeader>
            <CardContent className="text-sm whitespace-pre-wrap">{system.notes}</CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
