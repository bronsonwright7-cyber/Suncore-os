"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { buildSearchParams } from "@/lib/search-params";

/** Active/Inactive/All filter for entities with an `is_active` column. Defaults to Active. */
export function StatusFilter() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const current = Object.fromEntries(searchParams.entries());
  const value = searchParams.get("status") ?? "active";

  return (
    <Select
      value={value}
      onValueChange={(next) => {
        router.push(
          `${pathname}?${buildSearchParams(current, { status: next === "active" ? null : next, page: 1 })}`,
        );
      }}
    >
      <SelectTrigger className="w-[140px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="active">Active</SelectItem>
        <SelectItem value="inactive">Inactive</SelectItem>
        <SelectItem value="all">All</SelectItem>
      </SelectContent>
    </Select>
  );
}
