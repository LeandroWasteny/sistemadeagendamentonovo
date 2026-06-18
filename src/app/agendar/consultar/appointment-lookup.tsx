"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { ArrowLeft, CheckCircle2, Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type LookupResult = {
  id: string;
  lookupCode: string;
  clientName: string;
  status: string;
  statusLabel: string;
  serviceName: string;
  professionalName: string;
  startsAt: string;
  price: string;
};

const statusClasses: Record<string, string> = {
  PENDING: "bg-amber-50 text-amber-700 border-amber-100",
  CONFIRMED: "bg-emerald-50 text-emerald-700 border-emerald-100",
  CANCELLED: "bg-rose-50 text-rose-700 border-rose-100",
  COMPLETED: "bg-blue-50 text-blue-700 border-blue-100"
};

export function AppointmentLookup() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [appointment, setAppointment] = useState<LookupResult | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setAppointment(null);

    const formData = new FormData(event.currentTarget);
    const response = await fetch("/api/appointments/lookup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientPhone: formData.get("clientPhone"),
        lookupCode: formData.get("lookupCode")
      })
    });
    const data = await response.json();
    setLoading(false);

    if (!response.ok) {
      setError(data.error ?? "Nao foi possivel consultar.");
      return;
    }

    setAppointment(data.appointment);
  }

  return (
    <div className="rounded-[28px] bg-[var(--booking-surface)] p-4 shadow-2xl shadow-blue-950/10 md:p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[var(--booking-primary)]">Consulta segura</p>
          <h2 className="font-display mt-1 text-2xl font-semibold text-[var(--booking-text)] md:text-3xl">
            Meus horarios
          </h2>
        </div>
        <a
          href="/agendar"
          className="inline-flex h-9 items-center gap-2 rounded-full border border-blue-100 bg-white px-3 text-sm font-semibold text-[var(--booking-primary)] transition hover:border-[var(--booking-primary)] hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--booking-primary)]"
        >
          <ArrowLeft aria-hidden className="h-4 w-4" />
          Agendar
        </a>
      </div>

      <form onSubmit={handleSubmit} className="grid gap-3 md:grid-cols-[1fr_160px_auto]">
        <label className="space-y-1.5 text-sm font-semibold text-[var(--booking-text)]">
          WhatsApp
          <Input
            name="clientPhone"
            required
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="Ex.: 85999990000"
          />
        </label>
        <label className="space-y-1.5 text-sm font-semibold text-[var(--booking-text)]">
          Codigo
          <Input name="lookupCode" required autoComplete="one-time-code" placeholder="Ex.: A1B2C3D4" />
        </label>
        <Button className="h-12 gap-2 self-end rounded-[16px] bg-[var(--booking-primary)] hover:bg-[var(--booking-primary-dark)]" disabled={loading}>
          {loading ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : <Search aria-hidden className="h-4 w-4" />}
          Consultar
        </Button>
      </form>

      <p className="mt-3 text-sm leading-6 text-[var(--booking-muted)]">
        O codigo aparece na confirmacao criada pelo site. Ele evita que outra pessoa veja seus dados usando apenas o telefone.
      </p>

      {error && (
        <p aria-live="polite" className="mt-4 rounded-[16px] border border-rose-100 bg-rose-50 px-3 py-3 text-sm font-medium text-rose-700">
          {error}
        </p>
      )}

      {appointment && (
        <article className="mt-5 rounded-[22px] border border-blue-100 bg-blue-50/60 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-[var(--booking-primary)]">{appointment.clientName}</p>
              <h3 className="font-display mt-1 text-xl font-semibold text-[var(--booking-text)]">
                {appointment.serviceName}
              </h3>
            </div>
            <span className={cn("rounded-full border px-3 py-1 text-xs font-semibold", statusClasses[appointment.status] ?? "bg-slate-50 text-slate-600")}>
              {appointment.statusLabel}
            </span>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <InfoItem label="Profissional" value={appointment.professionalName} />
            <InfoItem label="Data e hora" value={formatAppointmentDate(appointment.startsAt)} />
            <InfoItem label="Valor" value={appointment.price} />
            <InfoItem label="Codigo" value={appointment.lookupCode} />
          </div>

          <p className="mt-4 flex items-center gap-2 rounded-[16px] bg-white px-3 py-3 text-sm font-medium text-emerald-700">
            <CheckCircle2 aria-hidden className="h-4 w-4" />
            Guarde este codigo para consultar novamente.
          </p>
        </article>
      )}
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[16px] bg-white px-3 py-3">
      <p className="text-xs font-semibold uppercase text-slate-400">{label}</p>
      <p className="mt-1 font-semibold text-[var(--booking-text)]">{value}</p>
    </div>
  );
}

function formatAppointmentDate(value: string) {
  return new Date(value).toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short"
  });
}
