import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(cents: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(cents / 100);
}

export function statusLabel(status: string) {
  const labels: Record<string, string> = {
    PENDING: "pendente",
    CONFIRMED: "confirmado",
    CANCELLED: "cancelado",
    COMPLETED: "concluido"
  };
  return labels[status] ?? status.toLowerCase();
}

