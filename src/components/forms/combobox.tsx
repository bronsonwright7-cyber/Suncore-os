"use client";

import { useState, useTransition } from "react";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

export interface ComboboxOption {
  value: string;
  label: string;
  description?: string;
}

interface ComboboxProps {
  name: string;
  defaultValue?: string;
  defaultLabel?: string;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  search: (query: string) => Promise<ComboboxOption[]>;
  onSelect?: (option: ComboboxOption | null) => void;
  required?: boolean;
  disabled?: boolean;
}

/**
 * A server-searched combobox for picking a related record (customer,
 * property, crew...) by name, backed by a Server Action rather than
 * fetching the entire table -- keeps working as the underlying table grows
 * well beyond what a plain <select> full of every row could handle.
 */
export function Combobox({
  name,
  defaultValue,
  defaultLabel,
  placeholder = "Select...",
  searchPlaceholder = "Search...",
  emptyText = "No results.",
  search,
  onSelect,
  required,
  disabled,
}: ComboboxProps) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(defaultValue ?? "");
  const [label, setLabel] = useState(defaultLabel ?? "");
  const [options, setOptions] = useState<ComboboxOption[]>([]);
  const [isPending, startTransition] = useTransition();

  function runSearch(query: string) {
    startTransition(async () => {
      const results = await search(query);
      setOptions(results);
    });
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) runSearch("");
      }}
    >
      <input type="hidden" name={name} value={value} required={required} />
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="w-full justify-between font-normal"
        >
          <span className={cn("truncate", !label && "text-muted-foreground")}>
            {label || placeholder}
          </span>
          <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-(--radix-popover-trigger-width) p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput placeholder={searchPlaceholder} onValueChange={runSearch} />
          <CommandList>
            {isPending ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="text-muted-foreground size-4 animate-spin" />
              </div>
            ) : (
              <>
                <CommandEmpty>{emptyText}</CommandEmpty>
                <CommandGroup>
                  {options.map((option) => (
                    <CommandItem
                      key={option.value}
                      value={option.value}
                      onSelect={() => {
                        const next = value === option.value ? "" : option.value;
                        setValue(next);
                        setLabel(next ? option.label : "");
                        setOpen(false);
                        onSelect?.(next ? option : null);
                      }}
                    >
                      <Check
                        className={cn(
                          "size-4",
                          value === option.value ? "opacity-100" : "opacity-0",
                        )}
                      />
                      <div className="flex flex-col">
                        <span>{option.label}</span>
                        {option.description ? (
                          <span className="text-muted-foreground text-xs">
                            {option.description}
                          </span>
                        ) : null}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
