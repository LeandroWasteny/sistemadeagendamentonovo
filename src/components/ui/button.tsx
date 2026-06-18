import * as React from "react";
import { cn } from "@/lib/utils";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "success" | "ghost" | "danger";
};

export function Button({ className, variant = "primary", ...props }: ButtonProps) {
  const variants = {
    primary: "bg-[#0F5EF7] text-white shadow-sm shadow-blue-500/20 hover:bg-[#0B4FD9]",
    secondary: "border border-blue-100 bg-white text-[#082F8B] hover:border-blue-200 hover:bg-blue-50",
    success: "bg-[#22C55E] text-white shadow-sm shadow-emerald-500/20 hover:bg-[#16A34A]",
    ghost: "text-[#082F8B] hover:bg-blue-50",
    danger: "bg-rose-500 text-white shadow-sm shadow-rose-500/20 hover:bg-rose-600"
  };

  return (
    <button
      className={cn(
        "inline-flex h-10 items-center justify-center rounded-[12px] px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50",
        variants[variant],
        className
      )}
      {...props}
    />
  );
}
