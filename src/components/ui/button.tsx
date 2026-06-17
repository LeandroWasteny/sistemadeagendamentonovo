import * as React from "react";
import { cn } from "@/lib/utils";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
};

export function Button({ className, variant = "primary", ...props }: ButtonProps) {
  const variants = {
    primary: "bg-zinc-950 text-white hover:bg-zinc-800",
    secondary: "bg-white text-zinc-950 border border-zinc-200 hover:bg-zinc-50",
    ghost: "text-zinc-700 hover:bg-zinc-100",
    danger: "bg-red-600 text-white hover:bg-red-700"
  };

  return (
    <button
      className={cn(
        "inline-flex h-10 items-center justify-center rounded-md px-4 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50",
        variants[variant],
        className
      )}
      {...props}
    />
  );
}

