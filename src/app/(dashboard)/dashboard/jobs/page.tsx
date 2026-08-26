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
import { JobFilters } from "@/components/jobs/job-filters";
import { JobStatusBadge } from "@/components/jobs/job-status-badge";
import { JobPriorityBadge } from "@/components/jobs/job-priority-badge";
import { listJobs, listActiveCrewsForFilter, listActiveJobTypes } from "@/server/jobs/queries";
import { getCurrentUserWithProfile } from "@/server/auth/current-user";
import { canManageCore } from "@/lib/permissions";
import { formatDateOnly } from "@/lib/format";
import type { RawSearchParams } from "@/lib/search-params";

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const resolvedSearchParams = await searchParams;
  const [session, { rows, count, page, pageSize, sort }, crews, jobTypes] = await Promise.all([
    getCurrentUserWithProfile(),
    listJobs(resolvedSearchParams),
    listActiveCrewsForFilter(),
    listActiveJobTypes(),
  ]);
  const canManage = canManageCore(session?.profile?.role ?? null);
  const pathname = "/dashboard/jobs";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-foreground text-lg font-semibold">Jobs</h1>
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
              <Link href="/dashboard/jobs/new">
                <Plus className="size-4" />
                New Job
              </Link>
            </Button>
          </div>
        ) : null}
      </div>

      <SearchInput placeholder="Search title, customer, or address..." />
      <JobFilters crews={crews} jobTypes={jobTypes} />

      <div className="border-border overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <SortableHeader
                  label="Job #"
                  column="job_number"
                  currentSort={sort}
                  searchParams={resolvedSearchParams}
                  pathname={pathname}
                />
              </TableHead>
              <TableHead>Title / Customer</TableHead>
              <TableHead>
                <SortableHeader
                  label="Status"
                  column="status"
                  currentSort={sort}
                  searchParams={resolvedSearchParams}
                  pathname={pathname}
                />
              </TableHead>
              <TableHead>
                <SortableHeader
                  label="Priority"
                  column="priority"
                  currentSort={sort}
                  searchParams={resolvedSearchParams}
                  pathname={pathname}
                />
              </TableHead>
              <TableHead>Crew</TableHead>
              <TableHead>
                <SortableHeader
                  label="Date"
                  column="appointment_date"
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
                <TableCell colSpan={6} className="text-muted-foreground h-24 text-center">
                  No jobs found.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((job) => (
                <TableRow key={job.id} className="hover:bg-muted/50">
                  <TableCell className="text-muted-foreground font-mono text-xs">
                    #{job.job_number}
                  </TableCell>
                  <TableCell className="font-medium">
                    <Link href={`/dashboard/jobs/${job.id}`} className="hover:underline">
                      {job.title}
                    </Link>
                    <p className="text-muted-foreground text-xs font-normal">
                      {job.customer_first_name} {job.customer_last_name} ·{" "}
                      {job.property_address_line1}
                    </p>
                  </TableCell>
                  <TableCell>
                    <JobStatusBadge status={job.status} />
                  </TableCell>
                  <TableCell>
                    <JobPriorityBadge priority={job.priority} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {job.assigned_crew_name ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDateOnly(job.appointment_date)}
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
