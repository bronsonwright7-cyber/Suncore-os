"use client";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ConflictFieldProps {
  id: string;
  label: string;
  /** Every distinct candidate value AI Intake extraction found for this field. */
  candidates: string[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  /** Show a "Required" badge (not blocking by itself -- the parent decides what blocks confirm). */
  required?: boolean;
}

/**
 * A text field that also surfaces AI Intake's extraction state for it:
 * - More than one candidate found in the pasted text -> "Conflict" badge and
 *   a radio choice between them (per PHASE C requirement #9 -- never
 *   silently pick one).
 * - No value at all -> "Missing" note (per requirement #8 -- never fabricate
 *   a value to fill the blank).
 * The text input itself is always editable, so the user can type a
 * corrected value instead of picking a candidate verbatim.
 */
export function ConflictField({
  id,
  label,
  candidates,
  value,
  onChange,
  placeholder,
  type = "text",
  required,
}: ConflictFieldProps) {
  const hasConflict = candidates.length > 1;
  const isMissing = value.trim().length === 0;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        <Label htmlFor={id}>{label}</Label>
        {hasConflict ? <Badge variant="destructive">Conflict</Badge> : null}
        {!hasConflict && isMissing ? <Badge variant="outline">Missing</Badge> : null}
        {required && isMissing ? <Badge variant="destructive">Required</Badge> : null}
      </div>
      {hasConflict ? (
        <div className="border-border bg-muted/30 flex flex-col gap-1.5 rounded-md border p-2">
          <p className="text-muted-foreground text-xs">
            Multiple values found in the pasted text -- pick the correct one:
          </p>
          {candidates.map((candidate) => (
            <label key={candidate} className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name={`${id}-conflict`}
                checked={value === candidate}
                onChange={() => onChange(candidate)}
                className="accent-primary"
              />
              {candidate}
            </label>
          ))}
        </div>
      ) : null}
      <Input
        id={id}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder ?? (isMissing ? "Not found in pasted text" : undefined)}
      />
    </div>
  );
}
