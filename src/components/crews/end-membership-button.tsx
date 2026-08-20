"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { endCrewMembership } from "@/server/crews/actions";

export function EndMembershipButton({
  membershipId,
  crewId,
}: {
  membershipId: string;
  crewId: string;
}) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      const result = await endCrewMembership(membershipId, crewId);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Membership ended");
      }
    });
  }

  return (
    <Button variant="ghost" size="sm" onClick={handleClick} disabled={isPending}>
      {isPending ? "Removing..." : "Remove"}
    </Button>
  );
}
