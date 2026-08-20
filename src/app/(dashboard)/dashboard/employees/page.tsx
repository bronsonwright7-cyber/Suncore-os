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
import { listEmployees } from "@/server/employees/queries";
import { getCurrentUserWithProfile } from "@/server/auth/current-user";
import { canManageCore } from "@/lib/permissions";
import type { RawSearchParams } from "@/lib/search-params";

export default async function EmployeesPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const resolvedSearchParams = await searchParams;
  const [session, { rows, count, page, pageSize, sort }] = await Promise.all([
    getCurrentUserWithProfile(),
    listEmployees(resolvedSearchParams),
  ]);
  const canManage = canManageCore(session?.profile?.role ?? null);
  const pathname = "/dashboard/employees";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-foreground text-lg font-semibold">Employees</h1>
          <p className="text-muted-foreground text-sm">{count} total</p>
        </div>
        {canManage ? (
          <Button asChild>
            <Link href="/dashboard/employees/new">
              <Plus className="size-4" />
              New Employee
            </Link>
          </Button>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <SearchInput placeholder="Search name, email, or title..." />
        <StatusFilter />
      </div>

      <div className="border-border overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <SortableHeader
                  label="Last name"
                  column="last_name"
                  currentSort={sort}
                  searchParams={resolvedSearchParams}
                  pathname={pathname}
                />
              </TableHead>
              <TableHead>
                <SortableHeader
                  label="First name"
                  column="first_name"
                  currentSort={sort}
                  searchParams={resolvedSearchParams}
                  pathname={pathname}
                />
              </TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-muted-foreground h-24 text-center">
                  No employees found.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((employee) => (
                <TableRow key={employee.id} className="hover:bg-muted/50">
                  <TableCell className="font-medium">
                    <Link href={`/dashboard/employees/${employee.id}`} className="hover:underline">
                      {employee.last_name}
                    </Link>
                  </TableCell>
                  <TableCell>{employee.first_name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {employee.job_title ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{employee.employee_type}</TableCell>
                  <TableCell>
                    <Badge variant={employee.is_active ? "default" : "secondary"}>
                      {employee.is_active ? "Active" : "Inactive"}
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
