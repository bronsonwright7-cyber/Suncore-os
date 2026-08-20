import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { JobPriority } from "@/types/database";

const PRIORITY_STYLES: Record<JobPriority, string> = {
  LOW: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  NORMAL: "bg-secondary text-secondary-foreground",
  HIGH: "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300",
  URGENT: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
};

const PRIORITY_LABELS: Record<JobPriority, string> = {
  LOW: "Low",
  NORMAL: "Normal",
  HIGH: "High",
  URGENT: "Urgent",
};

export function JobPriorityBadge({ priority }: { priority: JobPriority }) {
  return (
    <Badge className={cn("border-0", PRIORITY_STYLES[priority])}>{PRIORITY_LABELS[priority]}</Badge>
  );
}
