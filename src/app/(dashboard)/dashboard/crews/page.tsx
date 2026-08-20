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
import { listCrews } from "@/server/crews/queries";
import { getCurrentUserWithProfile } from "@/server/auth/current-user";
import { canManageCore } from "@/lib/permissions";
import type { RawSearchParams } from "@/lib/search-params";

export default async function CrewsPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const resolvedSearchParams = await searchParams;
  const [session, { rows, count, page, pageSize, sort }] = await Promise.all([
    getCurrentUserWithProfile(),
    listCrews(resolvedSearchParams),
  ]);
  const canManage = canManageCore(session?.profile?.role ?? null);
  const pathname = "/dashboard/crews";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-foreground text-lg font-semibold">Crews</h1>
          <p className="text-muted-foreground text-sm">{count} total</p>
        </div>
        {canManage ? (
          <Button asChild>
            <Link href="/dashboard/crews/new">
              <Plus className="size-4" />
              New Crew
            </Link>
          </Button>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <SearchInput placeholder="Search crew name..." />
        <StatusFilter />
      </div>

      <div className="border-border overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <SortableHeader
                  label="Name"
                  column="name"
                  currentSort={sort}
                  searchParams={resolvedSearchParams}
                  pathname={pathname}
                />
              </TableHead>
              <TableHead>Status</TableHead>
              <TableHead>
                <SortableHeader
                  label="Created"
                  column="created_at"
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
                <TableCell colSpan={3} className="text-muted-foreground h-24 text-center">
                  No crews found.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((crew) => (
                <TableRow key={crew.id} className="hover:bg-muted/50">
                  <TableCell className="font-medium">
                    <Link href={`/dashboard/crews/${crew.id}`} className="hover:underline">
                      {crew.name}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge variant={crew.is_active ? "default" : "secondary"}>
                      {crew.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(crew.created_at).toLocaleDateString()}
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
