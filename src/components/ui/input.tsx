import * as React from "react";
import { cn } from "@/lib/utils";

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        "h-10 w-full rounded-[12px] border border-blue-100 bg-white px-3 text-sm text-[#082F8B] outline-none transition placeholder:text-slate-400 focus:border-[#0F5EF7] focus:ring-4 focus:ring-blue-100",
        props.className
      )}
    />
  );
}
