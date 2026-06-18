import * as React from "react";
import { cn } from "@/lib/utils";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "success" | "ghost" | "danger";
};

export function Button({ className, variant = "primary", ...props }: ButtonProps) {
  const variants = {
    primary: "bg-[var(--brand-primary)] text-white shadow-sm shadow-blue-500/20 hover:bg-[#0B4FD9]",
    secondary: "border border-[var(--border-soft)] bg-[var(--surface-strong)] text-[var(--text-strong)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-tint)]",
    success: "bg-[var(--brand-success)] text-white shadow-sm shadow-emerald-500/20 hover:bg-[#16A34A]",
    ghost: "text-[var(--text-strong)] hover:bg-[var(--surface-tint)]",
    danger: "bg-rose-500 text-white shadow-sm shadow-rose-500/20 hover:bg-rose-600"
  };

  return (
    <button
      className={cn(
        "inline-flex h-10 items-center justify-center rounded-[12px] px-4 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        variants[variant],
        className
      )}
      {...props}
    />
  );
}
