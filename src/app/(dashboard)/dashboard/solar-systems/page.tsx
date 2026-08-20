import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { listSolarSystems } from "@/server/solar-systems/queries";
import { getCurrentUserWithProfile } from "@/server/auth/current-user";
import { canManageCore } from "@/lib/permissions";
import { formatDateOnly } from "@/lib/format";
import type { RawSearchParams } from "@/lib/search-params";

export default async function SolarSystemsPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const resolvedSearchParams = await searchParams;
  const [session, { rows, count, page, pageSize, sort }] = await Promise.all([
    getCurrentUserWithProfile(),
    listSolarSystems(resolvedSearchParams),
  ]);
  const canManage = canManageCore(session?.profile?.role ?? null);
  const pathname = "/dashboard/solar-systems";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-foreground text-lg font-semibold">Solar Systems</h1>
          <p className="text-muted-foreground text-sm">{count} total</p>
        </div>
        {canManage ? (
          <Button asChild>
            <Link href="/dashboard/solar-systems/new">
              <Plus className="size-4" />
              New Solar System
            </Link>
          </Button>
        ) : null}
      </div>

      <SearchInput placeholder="Search manufacturer or monitoring ID..." />

      <div className="border-border overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Property</TableHead>
              <TableHead>
                <SortableHeader
                  label="Size"
                  column="system_size_kw"
                  currentSort={sort}
                  searchParams={resolvedSearchParams}
                  pathname={pathname}
                />
              </TableHead>
              <TableHead>Panels</TableHead>
              <TableHead>
                <SortableHeader
                  label="Installed"
                  column="install_date"
                  currentSort={sort}
                  searchParams={resolvedSearchParams}
                  pathname={pathname}
                />
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-muted-foreground h-24 text-center">
                  No solar systems found.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((system) => (
                <TableRow key={system.id} className="hover:bg-muted/50">
                  <TableCell className="font-medium">
                    <Link
                      href={`/dashboard/solar-systems/${system.id}`}
                      className="hover:underline"
                    >
                      {system.property?.address_line1 ?? "—"}
                    </Link>
                    {system.property?.customer ? (
                      <p className="text-muted-foreground text-xs font-normal">
                        {system.property.customer.first_name} {system.property.customer.last_name}
                      </p>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {system.system_size_kw ? `${system.system_size_kw} kW` : "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {system.panel_count ?? "—"}
                    {system.panel_manufacturer ? ` · ${system.panel_manufacturer}` : ""}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDateOnly(system.install_date)}
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
