import * as React from "react";
import { cn } from "@/lib/utils";

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        "h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-zinc-500",
        props.className
      )}
    />
  );
}

