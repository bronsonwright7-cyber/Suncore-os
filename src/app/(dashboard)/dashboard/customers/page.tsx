import Link from "next/link";
import { ClipboardPaste, Plus } from "lucide-react";
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
import { listCustomers } from "@/server/customers/queries";
import { getCurrentUserWithProfile } from "@/server/auth/current-user";
import { canManageCore } from "@/lib/permissions";
import type { RawSearchParams } from "@/lib/search-params";

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const resolvedSearchParams = await searchParams;
  const [session, { rows, count, page, pageSize, sort }] = await Promise.all([
    getCurrentUserWithProfile(),
    listCustomers(resolvedSearchParams),
  ]);
  const canManage = canManageCore(session?.profile?.role ?? null);
  const pathname = "/dashboard/customers";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-foreground text-lg font-semibold">Customers</h1>
          <p className="text-muted-foreground text-sm">{count} total</p>
        </div>
        {canManage ? (
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link href="/dashboard/intake">
                <ClipboardPaste className="size-4" />
                Paste to create
              </Link>
            </Button>
            <Button asChild>
              <Link href="/dashboard/customers/new">
                <Plus className="size-4" />
                New Customer
              </Link>
            </Button>
          </div>
        ) : null}
      </div>

      <SearchInput placeholder="Search name, email, or phone..." />

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
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>
                <SortableHeader
                  label="Added"
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
                <TableCell colSpan={5} className="text-muted-foreground h-24 text-center">
                  No customers found.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((customer) => (
                <TableRow key={customer.id} className="hover:bg-muted/50">
                  <TableCell className="font-medium">
                    <Link href={`/dashboard/customers/${customer.id}`} className="hover:underline">
                      {customer.last_name}
                    </Link>
                  </TableCell>
                  <TableCell>{customer.first_name}</TableCell>
                  <TableCell className="text-muted-foreground">{customer.email ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{customer.phone ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(customer.created_at).toLocaleDateString()}
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
