"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { buildSearchParams } from "@/lib/search-params";
import { JOB_PRIORITIES, JOB_SOURCES, JOB_WORKFLOW_STATUSES } from "@/lib/constants";

interface JobFiltersProps {
  crews: { id: string; name: string }[];
  jobTypes: { id: string; label: string }[];
}

export function JobFilters({ crews, jobTypes }: JobFiltersProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const current = Object.fromEntries(searchParams.entries());

  function set(overrides: Record<string, string | null>) {
    router.push(`${pathname}?${buildSearchParams(current, { ...overrides, page: 1 })}`);
  }

  const status = searchParams.get("status") ?? "open";
  const priority = searchParams.get("priority") ?? "all";
  const source = searchParams.get("source") ?? "all";
  const crew = searchParams.get("crew") ?? "all";
  const type = searchParams.get("type") ?? "all";

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="flex flex-col gap-1.5">
        <Label className="text-muted-foreground text-xs">Status</Label>
        <Select value={status} onValueChange={(v) => set({ status: v === "open" ? null : v })}>
          <SelectTrigger className="w-[150px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="open">Open (not closed)</SelectItem>
            <SelectItem value="all">All statuses</SelectItem>
            {JOB_WORKFLOW_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {s.replaceAll("_", " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label className="text-muted-foreground text-xs">Priority</Label>
        <Select value={priority} onValueChange={(v) => set({ priority: v === "all" ? null : v })}>
          <SelectTrigger className="w-[130px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            {JOB_PRIORITIES.map((p) => (
              <SelectItem key={p.value} value={p.value}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label className="text-muted-foreground text-xs">Source</Label>
        <Select value={source} onValueChange={(v) => set({ source: v === "all" ? null : v })}>
          <SelectTrigger className="w-[150px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            {JOB_SOURCES.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label className="text-muted-foreground text-xs">Crew</Label>
        <Select value={crew} onValueChange={(v) => set({ crew: v === "all" ? null : v })}>
          <SelectTrigger className="w-[150px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All crews</SelectItem>
            {crews.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label className="text-muted-foreground text-xs">Job type</Label>
        <Select value={type} onValueChange={(v) => set({ type: v === "all" ? null : v })}>
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {jobTypes.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label className="text-muted-foreground text-xs">From</Label>
        <Input
          type="date"
          defaultValue={searchParams.get("from") ?? ""}
          onChange={(e) => set({ from: e.target.value || null })}
          className="w-[150px]"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label className="text-muted-foreground text-xs">To</Label>
        <Input
          type="date"
          defaultValue={searchParams.get("to") ?? ""}
          onChange={(e) => set({ to: e.target.value || null })}
          className="w-[150px]"
        />
      </div>
    </div>
  );
}
