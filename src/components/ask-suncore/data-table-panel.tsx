import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { TableVisualization } from "@/lib/ask-suncore/visualizations";

export function DataTablePanel({ spec }: { spec: TableVisualization }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{spec.title}</CardTitle>
        {spec.description && <CardDescription>{spec.description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              {spec.columns.map((col) => (
                <TableHead key={col.key} className={cn(col.align === "right" && "text-right")}>
                  {col.label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {spec.rows.map((row, i) => (
              <TableRow key={i}>
                {spec.columns.map((col) => (
                  <TableCell
                    key={col.key}
                    className={cn("tabular-nums", col.align === "right" && "text-right")}
                  >
                    {row[col.key] ?? "—"}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
