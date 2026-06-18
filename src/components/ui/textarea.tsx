import * as React from "react";
import { cn } from "@/lib/utils";

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={cn(
        "min-h-24 w-full rounded-[12px] border border-blue-100 bg-white px-3 py-2 text-sm text-[#082F8B] outline-none transition placeholder:text-slate-400 focus:border-[#0F5EF7] focus:ring-4 focus:ring-blue-100",
        props.className
      )}
    />
  );
}
