import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCustomer, listCustomerProperties } from "@/server/customers/queries";
import { getCurrentUserWithProfile } from "@/server/auth/current-user";
import { canManageCore } from "@/lib/permissions";

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [customer, properties, session] = await Promise.all([
    getCustomer(id),
    listCustomerProperties(id),
    getCurrentUserWithProfile(),
  ]);

  if (!customer) {
    notFound();
  }

  const canManage = canManageCore(session?.profile?.role ?? null);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-foreground text-lg font-semibold">
            {customer.first_name} {customer.last_name}
          </h1>
          <p className="text-muted-foreground text-sm">Customer</p>
        </div>
        {canManage ? (
          <Button variant="outline" asChild>
            <Link href={`/dashboard/customers/${customer.id}/edit`}>
              <Pencil className="size-4" />
              Edit
            </Link>
          </Button>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Contact info</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
            <div>
              <p className="text-muted-foreground">Email</p>
              <p>{customer.email ?? "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Phone</p>
              <p>{customer.phone ?? "—"}</p>
            </div>
            {customer.notes ? (
              <div className="sm:col-span-2">
                <p className="text-muted-foreground">Notes</p>
                <p className="whitespace-pre-wrap">{customer.notes}</p>
              </div>
            ) : null}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Record info</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-2 text-sm">
            <div>
              <p className="text-muted-foreground">Added</p>
              <p>{new Date(customer.created_at).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Last updated</p>
              <p>{new Date(customer.updated_at).toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-foreground text-base font-semibold">Properties</h2>
          {canManage ? (
            <Button variant="outline" size="sm" asChild>
              <Link href={`/dashboard/properties/new?customerId=${customer.id}`}>
                <Plus className="size-4" />
                Add Property
              </Link>
            </Button>
          ) : null}
        </div>
        {properties.length === 0 ? (
          <p className="text-muted-foreground text-sm">No properties on file yet.</p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {properties.map((property) => (
              <Link key={property.id} href={`/dashboard/properties/${property.id}`}>
                <Card className="hover:border-primary/50 transition-colors">
                  <CardContent className="text-sm">
                    <p className="font-medium">{property.address_line1}</p>
                    <p className="text-muted-foreground">
                      {property.city}, {property.state} {property.postal_code}
                    </p>
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
