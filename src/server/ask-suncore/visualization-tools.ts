import { tool } from "ai";
import {
  chartVisualizationSchema,
  kpiVisualizationSchema,
  tableVisualizationSchema,
} from "@/lib/ask-suncore/visualizations";

/**
 * "Render" tools -- the only way Ask Suncore AI can put a visual on screen.
 * Each tool's inputSchema is a closed, validated Zod shape (see
 * src/lib/ask-suncore/visualizations.ts): the model can only supply data
 * matching one of these three shapes. It cannot emit JSX, HTML, SQL, or any
 * other executable content -- the client (see src/components/ask-suncore)
 * reads the validated tool-call input and renders it through a fixed,
 * approved shadcn/Recharts component. The model never controls what code
 * runs, only these typed values.
 *
 * These tools have no real side effect -- `execute` just acknowledges receipt
 * so the model can continue with a closing sentence in the same turn. The
 * actual rendering happens client-side off the tool-call part in the message
 * stream.
 */

export const suncoreVisualizationTools = {
  renderKpi: tool({
    description:
      "Display a single important metric as a KPI card, optionally with a comparison to a " +
      "prior period. Use for a single headline number (e.g. 'how many jobs this month').",
    inputSchema: kpiVisualizationSchema,
    execute: async () => ({ rendered: true as const }),
  }),

  renderChart: tool({
    description:
      "Display a line, bar, stacked-bar, or donut chart. Use line/bar for a trend over time " +
      "(monthly jobs, revenue by month), bar for a ranked comparison (jobs by crew), and " +
      "bar or donut for a categorical breakdown (jobs by state). Use stacked-bar only when " +
      "there are genuinely multiple series to compare per category.",
    inputSchema: chartVisualizationSchema,
    execute: async () => ({ rendered: true as const }),
  }),

  renderTable: tool({
    description:
      "Display detailed records or a multi-column breakdown as a table. Use when the answer " +
      "is a list of rows the user asked to 'see' or 'show', or when a chart would lose " +
      "important detail.",
    inputSchema: tableVisualizationSchema,
    execute: async () => ({ rendered: true as const }),
  }),
};
