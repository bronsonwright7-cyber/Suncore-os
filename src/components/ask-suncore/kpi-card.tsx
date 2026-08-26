import { ArrowDown, ArrowRight, ArrowUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatNumber } from "@/lib/format";
import type { KpiVisualization, MetricFormat } from "@/lib/ask-suncore/visualizations";

function formatMetric(value: number, format: MetricFormat): string {
  if (format === "currency") return formatCurrency(value);
  if (format === "percent") return `${formatNumber(value)}%`;
  return formatNumber(value);
}

const DIRECTION_ICON = { up: ArrowUp, down: ArrowDown, flat: ArrowRight } as const;

export function KpiCard({ spec }: { spec: KpiVisualization }) {
  const DirectionIcon = spec.comparison ? DIRECTION_ICON[spec.comparison.direction] : null;

  return (
    <Card className="w-full max-w-xs">
      <CardHeader>
        <CardTitle className="text-muted-foreground text-sm font-medium">{spec.title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-foreground text-3xl font-semibold">
          {formatMetric(spec.value, spec.format)}
        </div>
        {spec.comparison && DirectionIcon && (
          <div className="text-muted-foreground mt-1 flex items-center gap-1.5 text-sm">
            <DirectionIcon className="size-3.5 shrink-0" />
            <span className="tabular-nums">
              {formatMetric(spec.comparison.value, spec.comparison.format)}
            </span>
            <span>{spec.comparison.label}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
