import * as React from "react";
import { cn } from "@/lib/utils";

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={cn(
        "h-10 w-full rounded-[12px] border border-blue-100 bg-white px-3 text-sm text-[#082F8B] outline-none transition focus:border-[#0F5EF7] focus:ring-4 focus:ring-blue-100",
        props.className
      )}
    />
  );
}
