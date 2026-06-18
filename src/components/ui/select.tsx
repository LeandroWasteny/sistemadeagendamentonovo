import * as React from "react";
import { cn } from "@/lib/utils";

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={cn(
        "h-11 min-h-11 w-full touch-manipulation rounded-[12px] border border-[var(--border-soft)] bg-[var(--surface-strong)] px-3 text-sm text-[var(--text-strong)] outline-none transition focus:border-[var(--focus-ring)] focus:ring-4 focus:ring-blue-100",
        props.className
      )}
    />
  );
}
