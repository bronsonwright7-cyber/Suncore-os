import Link from "next/link";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { buildSearchParams, type RawSearchParams, type SortDirection } from "@/lib/search-params";

interface SortableHeaderProps {
  label: string;
  column: string;
  currentSort: { column: string; direction: SortDirection };
  searchParams: RawSearchParams;
  pathname: string;
}

/** Plain server-renderable link -- no client interactivity needed for sorting. */
export function SortableHeader({
  label,
  column,
  currentSort,
  searchParams,
  pathname,
}: SortableHeaderProps) {
  const isActive = currentSort.column === column;
  const nextDirection: SortDirection = isActive && currentSort.direction === "asc" ? "desc" : "asc";
  const href = `${pathname}?${buildSearchParams(searchParams, { sort: column, dir: nextDirection, page: null })}`;

  const Icon = !isActive ? ArrowUpDown : currentSort.direction === "asc" ? ArrowUp : ArrowDown;

  return (
    <Link
      href={href}
      className={cn(
        "hover:text-foreground inline-flex items-center gap-1 text-sm font-medium",
        isActive ? "text-foreground" : "text-muted-foreground",
      )}
    >
      {label}
      <Icon className="size-3.5" />
    </Link>
  );
}
