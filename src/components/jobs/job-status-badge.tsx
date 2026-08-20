import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { JobStatus } from "@/types/database";

const STATUS_STYLES: Record<JobStatus, string> = {
  NEW: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  SCHEDULED: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300",
  ASSIGNED: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300",
  CREW_EN_ROUTE: "bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300",
  ON_SITE: "bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300",
  IN_PROGRESS: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  COMPLETED: "bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300",
  QA: "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300",
  CLOSED: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
};

const STATUS_LABELS: Record<JobStatus, string> = {
  NEW: "New",
  SCHEDULED: "Scheduled",
  ASSIGNED: "Assigned",
  CREW_EN_ROUTE: "Crew En Route",
  ON_SITE: "On Site",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
  QA: "QA",
  CLOSED: "Closed",
};

export function JobStatusBadge({ status }: { status: JobStatus }) {
  return <Badge className={cn("border-0", STATUS_STYLES[status])}>{STATUS_LABELS[status]}</Badge>;
}
