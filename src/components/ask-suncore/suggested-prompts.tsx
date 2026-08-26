import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export const STARTER_PROMPTS = [
  "How many jobs did we complete this month?",
  "What have our monthly sales been each month this year?",
  "Which crews completed the most jobs?",
  "How many customers did we add each month?",
  "Show me jobs by state.",
  "Give me a management summary of our business this month.",
];

export const FOLLOW_UP_PROMPTS = [
  "Compare that to last month",
  "Break that down by crew",
  "Show that as a table",
];

export function SuggestedPrompts({
  prompts,
  onSelect,
  className,
}: {
  prompts: string[];
  onSelect: (prompt: string) => void;
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="flex flex-wrap gap-2">
        {prompts.map((prompt) => (
          <Button
            key={prompt}
            type="button"
            variant="outline"
            size="sm"
            className="h-auto rounded-full px-3 py-1.5 text-left text-xs font-normal whitespace-normal"
            onClick={() => onSelect(prompt)}
          >
            <Sparkles className="size-3 shrink-0 opacity-60" />
            {prompt}
          </Button>
        ))}
      </div>
    </div>
  );
}
