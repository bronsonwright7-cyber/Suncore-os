"use client";

import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { formatCurrency, formatNumber } from "@/lib/format";
import type { ChartVisualization, MetricFormat } from "@/lib/ask-suncore/visualizations";

/** Validated categorical palette (dataviz skill) -- fixed order, never cycled per series identity. */
const PALETTE = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-6)",
];

function formatValue(value: number, format: MetricFormat): string {
  if (format === "currency") return formatCurrency(value);
  if (format === "percent") return `${formatNumber(value)}%`;
  return formatNumber(value);
}

export function ChartPanel({ spec }: { spec: ChartVisualization }) {
  return spec.chartType === "donut" ? <DonutPanel spec={spec} /> : <CartesianPanel spec={spec} />;
}

function CartesianPanel({ spec }: { spec: ChartVisualization }) {
  const config: ChartConfig = Object.fromEntries(
    spec.series.map((s, i) => [s.key, { label: s.label, color: PALETTE[i % PALETTE.length] }]),
  );
  const flatData = spec.data.map((point) => ({ label: point.label, ...point.values }));
  const showLegend = spec.series.length > 1;
  const tickFormatter = (value: number) => formatValue(value, spec.valueFormat);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{spec.title}</CardTitle>
        {spec.description && <CardDescription>{spec.description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <ChartContainer config={config} className="aspect-auto h-64 w-full">
          {spec.chartType === "line" ? (
            <LineChart data={flatData} margin={{ left: 4, right: 4, top: 8 }}>
              <CartesianGrid vertical={false} stroke="var(--border)" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} fontSize={12} />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                fontSize={12}
                width={48}
                tickFormatter={tickFormatter}
              />
              <ChartTooltip
                content={<ChartTooltipContent formatter={(value) => formatValue(Number(value), spec.valueFormat)} />}
              />
              {showLegend && <ChartLegend content={<ChartLegendContent />} />}
              {spec.series.map((s, i) => (
                <Line
                  key={s.key}
                  type="monotone"
                  dataKey={s.key}
                  stroke={PALETTE[i % PALETTE.length]}
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
              ))}
            </LineChart>
          ) : (
            <BarChart data={flatData} margin={{ left: 4, right: 4, top: 8 }}>
              <CartesianGrid vertical={false} stroke="var(--border)" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} fontSize={12} />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                fontSize={12}
                width={48}
                tickFormatter={tickFormatter}
              />
              <ChartTooltip
                content={<ChartTooltipContent formatter={(value) => formatValue(Number(value), spec.valueFormat)} />}
              />
              {showLegend && <ChartLegend content={<ChartLegendContent />} />}
              {spec.series.map((s, i) => (
                <Bar
                  key={s.key}
                  dataKey={s.key}
                  fill={PALETTE[i % PALETTE.length]}
                  radius={4}
                  maxBarSize={24}
                  stackId={spec.chartType === "stacked-bar" ? "stack" : undefined}
                />
              ))}
            </BarChart>
          )}
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

function DonutPanel({ spec }: { spec: ChartVisualization }) {
  const seriesKey = spec.series[0]?.key ?? "value";
  const slices = spec.data.map((point, i) => ({
    label: point.label,
    value: point.values[seriesKey] ?? 0,
    fill: PALETTE[i % PALETTE.length],
  }));
  const config: ChartConfig = Object.fromEntries(
    slices.map((slice, i) => [slice.label, { label: slice.label, color: PALETTE[i % PALETTE.length] }]),
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{spec.title}</CardTitle>
        {spec.description && <CardDescription>{spec.description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <ChartContainer config={config} className="mx-auto aspect-square h-64">
          <PieChart>
            <ChartTooltip
              content={
                <ChartTooltipContent nameKey="label" formatter={(value) => formatValue(Number(value), spec.valueFormat)} />
              }
            />
            <Pie
              data={slices}
              dataKey="value"
              nameKey="label"
              innerRadius={56}
              outerRadius={88}
              paddingAngle={2}
              strokeWidth={2}
              stroke="var(--card)"
            >
              {slices.map((slice) => (
                <Cell key={slice.label} fill={slice.fill} />
              ))}
            </Pie>
            <ChartLegend content={<ChartLegendContent nameKey="label" />} />
          </PieChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
