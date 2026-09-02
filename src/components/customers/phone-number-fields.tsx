"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { PhoneType } from "@/types/database";

const PHONE_TYPES: { value: PhoneType; label: string }[] = [
  { value: "mobile", label: "Mobile" },
  { value: "home", label: "Home" },
  { value: "work", label: "Work" },
  { value: "other", label: "Other" },
];

export interface InitialPhoneRow {
  phoneNumber: string;
  phoneType: PhoneType;
  isPrimary: boolean;
}

interface Row {
  key: string;
  phoneNumber: string;
  phoneType: PhoneType;
}

let keySeq = 0;
function nextKey() {
  keySeq += 1;
  return `phone-${keySeq}`;
}

/**
 * Repeatable phone-number rows for the customer form: number + type select +
 * a single "primary" radio shared across all rows (native radio semantics
 * already guarantee at most one selected, matching the "exactly one primary"
 * invariant customer_phone_numbers enforces server-side too -- see
 * supabase/migrations/0018_customer_phone_numbers.sql).
 *
 * Submits as parallel same-name fields (phone_number[]/phone_type[]) plus
 * primary_phone_index -- parsed by parsePhoneNumbersForm in
 * src/server/customers/actions.ts. This is a native <form>-compatible
 * pattern (no client-side JSON blob), matching every other Server-Action
 * form in this app.
 */
export function PhoneNumberFields({ initialRows }: { initialRows: InitialPhoneRow[] }) {
  const [rows, setRows] = useState<Row[]>(() =>
    initialRows.map((r) => ({ key: nextKey(), phoneNumber: r.phoneNumber, phoneType: r.phoneType })),
  );
  const [primaryKey, setPrimaryKey] = useState<string | null>(() => {
    const primaryIdx = initialRows.findIndex((r) => r.isPrimary);
    return (primaryIdx >= 0 ? rows[primaryIdx]?.key : rows[0]?.key) ?? null;
  });

  function addRow() {
    const key = nextKey();
    setRows((prev) => [...prev, { key, phoneNumber: "", phoneType: "mobile" }]);
    setPrimaryKey((prev) => prev ?? key);
  }

  function removeRow(key: string) {
    const next = rows.filter((r) => r.key !== key);
    setRows(next);
    if (primaryKey === key) {
      setPrimaryKey(next[0]?.key ?? null);
    }
  }

  function updateRow(key: string, patch: Partial<Pick<Row, "phoneNumber" | "phoneType">>) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <Label>Phone numbers</Label>
        <Button type="button" variant="outline" size="sm" onClick={addRow}>
          <Plus className="size-4" />
          Add phone number
        </Button>
      </div>
      {rows.length === 0 ? (
        <p className="text-muted-foreground text-sm">No phone numbers added.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {rows.map((row, index) => (
            <div key={row.key} className="flex items-center gap-2">
              <input
                type="radio"
                name="primary_phone_index"
                value={index}
                checked={primaryKey === row.key}
                onChange={() => setPrimaryKey(row.key)}
                className="accent-primary shrink-0"
                aria-label={`Set ${row.phoneNumber || "this number"} as primary`}
              />
              <Input
                name="phone_number[]"
                type="tel"
                placeholder="Phone number"
                value={row.phoneNumber}
                onChange={(e) => updateRow(row.key, { phoneNumber: e.target.value })}
                className="flex-1"
              />
              <Select
                name="phone_type[]"
                value={row.phoneType}
                onValueChange={(phoneType) => updateRow(row.key, { phoneType: phoneType as PhoneType })}
              >
                <SelectTrigger className="w-28 shrink-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PHONE_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeRow(row.key)}
                aria-label="Remove phone number"
              >
                <X className="size-4" />
              </Button>
            </div>
          ))}
          <p className="text-muted-foreground text-xs">
            Select the radio button next to a number to make it primary.
          </p>
        </div>
      )}
    </div>
  );
}
