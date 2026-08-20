import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SearchInput } from "@/components/data-table/search-input";
import { SortableHeader } from "@/components/data-table/sortable-header";
import { PaginationControls } from "@/components/data-table/pagination-controls";
import { StatusFilter } from "@/components/data-table/status-filter";
import { listPartners } from "@/server/partners/queries";
import { getCurrentUserWithProfile } from "@/server/auth/current-user";
import { canManageCore } from "@/lib/permissions";
import type { RawSearchParams } from "@/lib/search-params";

export default async function PartnersPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const resolvedSearchParams = await searchParams;
  const [session, { rows, count, page, pageSize, sort }] = await Promise.all([
    getCurrentUserWithProfile(),
    listPartners(resolvedSearchParams),
  ]);
  const canManage = canManageCore(session?.profile?.role ?? null);
  const pathname = "/dashboard/partners";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-foreground text-lg font-semibold">Partners</h1>
          <p className="text-muted-foreground text-sm">{count} total</p>
        </div>
        {canManage ? (
          <Button asChild>
            <Link href="/dashboard/partners/new">
              <Plus className="size-4" />
              New Partner
            </Link>
          </Button>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <SearchInput placeholder="Search company or contact..." />
        <StatusFilter />
      </div>

      <div className="border-border overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <SortableHeader
                  label="Company"
                  column="name"
                  currentSort={sort}
                  searchParams={resolvedSearchParams}
                  pathname={pathname}
                />
              </TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-muted-foreground h-24 text-center">
                  No partners found.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((partner) => (
                <TableRow key={partner.id} className="hover:bg-muted/50">
                  <TableCell className="font-medium">
                    <Link href={`/dashboard/partners/${partner.id}`} className="hover:underline">
                      {partner.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{partner.partner_type}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {partner.contact_name ?? "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={partner.is_active ? "default" : "secondary"}>
                      {partner.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <PaginationControls page={page} pageSize={pageSize} totalCount={count} />
    </div>
  );
}
