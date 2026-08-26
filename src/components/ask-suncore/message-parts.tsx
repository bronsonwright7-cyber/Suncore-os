"use client";

import type { UIMessage } from "ai";
import { Loader2 } from "lucide-react";
import { ChartPanel } from "@/components/ask-suncore/chart-panel";
import { DataTablePanel } from "@/components/ask-suncore/data-table-panel";
import { KpiCard } from "@/components/ask-suncore/kpi-card";
import { cn } from "@/lib/utils";
import type { ChartVisualization, KpiVisualization, TableVisualization } from "@/lib/ask-suncore/visualizations";

/**
 * Renders one part of a streamed Ask Suncore message. The model can only
 * ever reach this component through the closed set of render-tool calls
 * (renderKpi/renderChart/renderTable) validated server-side against the
 * schemas in src/lib/ask-suncore/visualizations.ts -- this file decides how
 * those validated values are drawn, the model never supplies markup itself.
 * Every other tool call (the getX reporting tools) is shown only as a
 * lightweight "checked X" status line, never as raw JSON.
 */

const DATA_TOOL_LABELS: Record<string, string> = {
  getJobStatusCounts: "job status counts",
  getJobsCompletedByMonth: "jobs completed by month",
  getRevenueByMonth: "revenue by month",
  getCrewCompletions: "crew completions",
  getCustomersAddedByMonth: "customers added by month",
  getJobsByState: "jobs by state",
};

type AnyUIMessagePart = UIMessage["parts"][number];

export function MessagePart({ part }: { part: AnyUIMessagePart }) {
  if (part.type === "text") {
    if (!part.text) return null;
    return <p className="text-sm leading-relaxed whitespace-pre-wrap">{part.text}</p>;
  }

  if (part.type === "tool-renderKpi") {
    if (part.state === "input-available" || part.state === "output-available") {
      return <KpiCard spec={part.input as KpiVisualization} />;
    }
    return null;
  }

  if (part.type === "tool-renderChart") {
    if (part.state === "input-available" || part.state === "output-available") {
      return <ChartPanel spec={part.input as ChartVisualization} />;
    }
    return null;
  }

  if (part.type === "tool-renderTable") {
    if (part.state === "input-available" || part.state === "output-available") {
      return <DataTablePanel spec={part.input as TableVisualization} />;
    }
    return null;
  }

  if (part.type.startsWith("tool-")) {
    const toolName = part.type.slice("tool-".length);
    const label = DATA_TOOL_LABELS[toolName];
    if (!label) return null;

    const state = "state" in part ? part.state : undefined;
    const running = state === "input-streaming" || state === "input-available";
    if (running) {
      return (
        <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
          <Loader2 className="size-3 shrink-0 animate-spin" />
          <span>Checking {label}…</span>
        </div>
      );
    }

    if (state === "output-error") {
      return (
        <div className="text-destructive flex items-center gap-1.5 text-xs">
          <span className="bg-destructive size-1.5 shrink-0 rounded-full" />
          <span>Couldn&apos;t check {label}</span>
        </div>
      );
    }

    // output-available: distinguish "found rows" from "ran fine, nothing to
    // report" so an empty result never reads as if useful data was found.
    const output = "output" in part ? part.output : undefined;
    const hasData = Array.isArray(output) && output.length > 0;
    return (
      <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
        <span
          className={cn(
            "size-1.5 shrink-0 rounded-full",
            hasData ? "bg-[var(--chart-3)]" : "bg-muted-foreground/40",
          )}
        />
        <span>{hasData ? `Checked ${label}` : `Checked ${label} — no data found`}</span>
      </div>
    );
  }

  return null;
}
