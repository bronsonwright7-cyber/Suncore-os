"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { buildSearchParams } from "@/lib/search-params";

interface SearchInputProps {
  placeholder?: string;
  paramKey?: string;
  className?: string;
}

export function SearchInput({
  placeholder = "Search...",
  paramKey = "q",
  className,
}: SearchInputProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const initial = searchParams.get(paramKey) ?? "";
  const [value, setValue] = useState(initial);
  // Keep the input in sync if the URL changes from elsewhere (back/forward
  // nav) -- adjusted during render rather than in an effect, per
  // https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes
  const [prevInitial, setPrevInitial] = useState(initial);
  if (initial !== prevInitial) {
    setPrevInitial(initial);
    setValue(initial);
  }

  useEffect(() => {
    if (value === initial) return;
    const handle = setTimeout(() => {
      const current = Object.fromEntries(searchParams.entries());
      router.push(
        `${pathname}?${buildSearchParams(current, { [paramKey]: value || null, page: 1 })}`,
      );
    }, 350);
    return () => clearTimeout(handle);
  }, [value, initial, searchParams, router, pathname, paramKey]);

  return (
    <Input
      value={value}
      onChange={(event) => setValue(event.target.value)}
      placeholder={placeholder}
      className={className ?? "max-w-sm"}
      type="search"
    />
  );
}
