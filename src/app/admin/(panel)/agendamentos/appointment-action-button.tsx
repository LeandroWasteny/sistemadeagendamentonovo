"use client";

import { useFormStatus } from "react-dom";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

export function AppointmentActionButton({
  children,
  pendingLabel = "Processando...",
  disabled = false,
  variant = "secondary",
  className = "w-full gap-2"
}: {
  children: ReactNode;
  pendingLabel?: string;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "success" | "ghost" | "danger";
  className?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <Button className={className} disabled={disabled || pending} variant={variant}>
      {pending ? pendingLabel : children}
    </Button>
  );
}
