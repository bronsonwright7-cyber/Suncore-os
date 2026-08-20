import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ToggleActiveButton } from "@/components/forms/toggle-active-button";
import { getPartner } from "@/server/partners/queries";
import { setPartnerActive } from "@/server/partners/actions";
import { getCurrentUserWithProfile } from "@/server/auth/current-user";
import { canManageCore } from "@/lib/permissions";

export default async function PartnerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [partner, session] = await Promise.all([getPartner(id), getCurrentUserWithProfile()]);

  if (!partner) {
    notFound();
  }

  const canManage = canManageCore(session?.profile?.role ?? null);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-foreground text-lg font-semibold">{partner.name}</h1>
            <p className="text-muted-foreground text-sm">{partner.partner_type}</p>
          </div>
          <Badge variant={partner.is_active ? "default" : "secondary"}>
            {partner.is_active ? "Active" : "Inactive"}
          </Badge>
        </div>
        {canManage ? (
          <div className="flex gap-2">
            <ToggleActiveButton
              id={partner.id}
              isActive={partner.is_active}
              action={setPartnerActive}
            />
            <Button variant="outline" asChild>
              <Link href={`/dashboard/partners/${partner.id}/edit`}>
                <Pencil className="size-4" />
                Edit
              </Link>
            </Button>
          </div>
        ) : null}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Contact</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
          <div>
            <p className="text-muted-foreground">Name</p>
            <p>{partner.contact_name ?? "—"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Phone</p>
            <p>{partner.contact_phone ?? "—"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Email</p>
            <p>{partner.contact_email ?? "—"}</p>
          </div>
        </CardContent>
      </Card>

      {partner.notes ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Notes</CardTitle>
          </CardHeader>
          <CardContent className="text-sm whitespace-pre-wrap">{partner.notes}</CardContent>
        </Card>
      ) : null}
    </div>
  );
}
