"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { transitionJobStatus } from "@/server/jobs/actions";
import type { JobStatus, UserRole } from "@/types/database";

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

interface JobStatusActionsProps {
  jobId: string;
  currentStatus: JobStatus;
  allowedNextStatuses: JobStatus[];
  role: UserRole | null;
}

export function JobStatusActions({
  jobId,
  currentStatus,
  allowedNextStatuses,
  role,
}: JobStatusActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  function runTransition(toStatus: JobStatus, reason: string | null) {
    startTransition(async () => {
      const result = await transitionJobStatus(jobId, toStatus, reason);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(`Status changed to ${STATUS_LABELS[toStatus]}`);
        setRejectOpen(false);
        setRejectReason("");
        router.refresh();
      }
    });
  }

  // QA reviewers may only approve (-> CLOSED) or reject (-> IN_PROGRESS) a
  // job that is currently in QA -- mirrors fn_transition_job_status().
  if (role === "QA") {
    if (currentStatus !== "QA") return null;
    return (
      <div className="flex gap-2">
        <Button onClick={() => runTransition("CLOSED", null)} disabled={isPending}>
          Approve
        </Button>
        <Button variant="destructive" onClick={() => setRejectOpen(true)} disabled={isPending}>
          Reject
        </Button>
        <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reject and send back to In Progress</DialogTitle>
            </DialogHeader>
            <Textarea
              placeholder="Reason for rejection (recorded on the job timeline)"
              value={rejectReason}
              onChange={(event) => setRejectReason(event.target.value)}
              rows={4}
            />
            <DialogFooter>
              <Button
                variant="destructive"
                disabled={isPending || rejectReason.trim().length === 0}
                onClick={() => runTransition("IN_PROGRESS", rejectReason.trim())}
              >
                {isPending ? "Submitting..." : "Confirm rejection"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  if (role !== "OWNER" && role !== "ADMIN" && role !== "OFFICE") {
    return null;
  }

  if (allowedNextStatuses.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {allowedNextStatuses.map((status) => (
        <Button
          key={status}
          variant={status === "CLOSED" ? "default" : "outline"}
          onClick={() => runTransition(status, null)}
          disabled={isPending}
        >
          {isPending ? "Updating..." : `Mark as ${STATUS_LABELS[status]}`}
        </Button>
      ))}
    </div>
  );
}
