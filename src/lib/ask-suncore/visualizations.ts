import { z } from "zod";

/**
 * The closed set of visualization specifications Ask Suncore AI is allowed to
 * produce. These are tool *input* schemas -- the model can only fill in these
 * fields, never emit JSX/HTML/SQL/arbitrary code. React renders each spec
 * through a fixed, approved component (see src/components/ask-suncore); the
 * model never controls what gets rendered, only these validated values.
 */

export const metricFormatSchema = z.enum(["number", "currency", "percent"]);
export type MetricFormat = z.infer<typeof metricFormatSchema>;

export const kpiVisualizationSchema = z.object({
  title: z.string().describe("Short label for the metric, e.g. 'Jobs completed this month'"),
  value: z.number().describe("The headline metric value, taken directly from a prior tool result"),
  format: metricFormatSchema.default("number"),
  comparison: z
    .object({
      label: z.string().describe("What this is compared against, e.g. 'vs last month'"),
      value: z.number().describe("The delta amount (signed), or the comparison period's value"),
      format: metricFormatSchema.default("number"),
      direction: z.enum(["up", "down", "flat"]),
    })
    .optional()
    .describe("Omit if there is nothing to compare against"),
});
export type KpiVisualization = z.infer<typeof kpiVisualizationSchema>;

export const chartSeriesSchema = z.object({
  key: z.string().describe("Key used in each data point's `values` object for this series"),
  label: z.string().describe("Human-readable series name shown in the legend and tooltip"),
});

export const chartDataPointSchema = z.object({
  label: z
    .string()
    .describe("Category for this point: a month ('Jan 2026'), crew name, state, or status"),
  values: z.record(z.string(), z.number()).describe("Series key -> numeric value for this point"),
});

export const chartVisualizationSchema = z.object({
  chartType: z.enum(["line", "bar", "stacked-bar", "donut"]),
  title: z.string(),
  description: z
    .string()
    .optional()
    .describe("One short clarifying sentence, e.g. a caveat that revenue is approximate"),
  valueFormat: metricFormatSchema.default("number"),
  series: z.array(chartSeriesSchema).min(1).max(6),
  data: z.array(chartDataPointSchema).min(1).max(60),
});
export type ChartVisualization = z.infer<typeof chartVisualizationSchema>;

export const tableColumnSchema = z.object({
  key: z.string(),
  label: z.string(),
  align: z.enum(["left", "right"]).optional(),
});

export const tableVisualizationSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  columns: z.array(tableColumnSchema).min(1).max(8),
  rows: z.array(z.record(z.string(), z.union([z.string(), z.number()]))).min(1).max(50),
});
export type TableVisualization = z.infer<typeof tableVisualizationSchema>;
