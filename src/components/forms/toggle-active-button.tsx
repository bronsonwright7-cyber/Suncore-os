"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

interface ToggleActiveButtonProps {
  id: string;
  isActive: boolean;
  action: (id: string, isActive: boolean) => Promise<{ error?: string }>;
  activeLabel?: string;
  inactiveLabel?: string;
}

export function ToggleActiveButton({
  id,
  isActive,
  action,
  activeLabel = "Deactivate",
  inactiveLabel = "Reactivate",
}: ToggleActiveButtonProps) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      const result = await action(id, !isActive);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(isActive ? "Deactivated" : "Reactivated");
      }
    });
  }

  return (
    <Button variant="outline" size="sm" onClick={handleClick} disabled={isPending}>
      {isPending ? "Saving..." : isActive ? activeLabel : inactiveLabel}
    </Button>
  );
}
