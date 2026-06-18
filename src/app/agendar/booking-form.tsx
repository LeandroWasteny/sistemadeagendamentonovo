"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Check,
  CheckCircle2,
  Clock3,
  Loader2,
  MessageCircle,
  Search,
  Send,
  UserRound
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { PublicBookingProfile } from "@/lib/booking/public-profile";
import { cn, formatCurrency } from "@/lib/utils";

type ServiceOption = {
  id: string;
  name: string;
  description: string | null;
  durationMinutes: number;
  priceCents: number;
  professionalIds: string[];
};

type ProfessionalOption = {
  id: string;
  name: string;
  specialties: string;
  serviceIds: string[];
};

type Slot = {
  time: string;
  startsAt: string;
};

type DayOption = {
  value: string;
  weekday: string;
  day: string;
  month: string;
  label: string;
};

export function BookingForm({
  profile,
  services,
  professionals
}: {
  profile: PublicBookingProfile;
  services: ServiceOption[];
  professionals: ProfessionalOption[];
}) {
  const days = useMemo(() => buildDayOptions(30), []);
  const firstDay = days[0]?.value ?? "";

  const [serviceId, setServiceId] = useState("");
  const [professionalId, setProfessionalId] = useState("");
  const [date, setDate] = useState(firstDay);
  const [slot, setSlot] = useState("");
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [lookupCode, setLookupCode] = useState("");

  const selectedService = services.find((service) => service.id === serviceId);
  const selectedProfessional = professionals.find((professional) => professional.id === professionalId);
  const selectedDay = days.find((day) => day.value === date);

  const compatibleProfessionals = useMemo(() => {
    if (!selectedService) return [];
    return professionals.filter((professional) => selectedService.professionalIds.includes(professional.id));
  }, [professionals, selectedService]);

  useEffect(() => {
    if (!serviceId) {
      setProfessionalId("");
      return;
    }
    const compatible = professionals.filter((professional) => professional.serviceIds.includes(serviceId));
    if (professionalId && !compatible.some((professional) => professional.id === professionalId)) {
      setProfessionalId("");
    }
  }, [professionals, professionalId, serviceId]);

  useEffect(() => {
    if (!serviceId || !professionalId || !date) {
      setSlots([]);
      setSlot("");
      return;
    }

    const controller = new AbortController();
    setLoadingSlots(true);
    setSlot("");

    fetch(`/api/availability?serviceId=${serviceId}&professionalId=${professionalId}&date=${date}`, {
      signal: controller.signal
    })
      .then((response) => response.json())
      .then((data) => setSlots(data.slots ?? []))
      .catch((error) => {
        if (error.name !== "AbortError") setSlots([]);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadingSlots(false);
      });

    return () => controller.abort();
  }, [serviceId, professionalId, date]);

  async function handleSubmit(formData: FormData) {
    setSaving(true);
    setMessage("");
    setLookupCode("");
    const response = await fetch("/api/appointments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        serviceId,
        professionalId,
        startsAt: slot,
        clientName: formData.get("clientName"),
        clientPhone: formData.get("clientPhone"),
        notes: formData.get("notes")
      })
    });
    const data = await response.json();
    setSaving(false);
    if (response.ok) {
      setLookupCode(data.lookupCode ?? "");
      setMessage("Agendamento criado. A confirmacao do WhatsApp sera enviada se a conexao estiver ativa.");
      setSlot("");
    } else {
      setMessage(data.error ?? "Nao foi possivel agendar.");
    }
  }

  const hasCompatibleProfessionals = Boolean(selectedService && compatibleProfessionals.length > 0);
  const canSubmit = Boolean(serviceId && professionalId && slot);
  const selectedDateLabel = selectedDay?.label ?? formatDateLabel(date);

  return (
    <form action={handleSubmit} className="rounded-[28px] bg-[var(--booking-surface)] p-4 shadow-2xl shadow-blue-950/10 md:p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[var(--booking-primary)]">{profile.businessName}</p>
          <h2 className="font-display mt-1 text-2xl font-semibold text-[var(--booking-text)] md:text-3xl">
            Agendar horario
          </h2>
        </div>
        <div className="rounded-full bg-[var(--booking-accent-soft)] px-3 py-1.5 text-xs font-semibold text-[var(--booking-accent)]">
          Online
        </div>
        <a
          href="/agendar/consultar"
          className="inline-flex h-11 min-h-11 touch-manipulation items-center gap-2 rounded-full border border-blue-100 bg-white px-4 text-sm font-semibold text-[var(--booking-primary)] transition hover:border-[var(--booking-primary)] hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--booking-primary)]"
        >
          <Search aria-hidden className="h-4 w-4" />
          Meus horarios
        </a>
      </div>

      <ProgressSteps active={slot ? 3 : professionalId ? 2 : serviceId ? 1 : 0} />

      <section className="mt-5">
        <SectionTitle icon={CalendarDays} label="Servico" />
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {services.length === 0 && (
            <p className="rounded-[16px] bg-slate-100 px-4 py-4 text-sm font-medium text-slate-500">
              Nenhum servico disponivel.
            </p>
          )}
          {services.map((service) => {
            const active = service.id === serviceId;
            return (
              <button
                key={service.id}
                type="button"
                className={cn(
                  "min-h-28 rounded-[20px] border p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--booking-primary)]",
                  active
                    ? "border-[var(--booking-primary)] bg-[var(--booking-primary)] text-white shadow-lg shadow-blue-500/20"
                    : "border-blue-100 bg-white text-[var(--booking-text)] hover:border-[var(--booking-primary)] hover:bg-blue-50"
                )}
                onClick={() => {
                  setServiceId(service.id);
                  setProfessionalId("");
                  setSlot("");
                }}
                aria-pressed={active}
              >
                <span className="flex items-start justify-between gap-3">
                  <span>
                    <span className="block text-base font-semibold">{service.name}</span>
                    <span className={cn("mt-1 block text-sm", active ? "text-white/80" : "text-slate-500")}>
                      {service.durationMinutes} min
                    </span>
                  </span>
                  <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", active ? "bg-white/15" : "bg-blue-50 text-[var(--booking-primary)]")}>
                    {formatCurrency(service.priceCents)}
                  </span>
                </span>
                {service.description && (
                  <span className={cn("mt-3 line-clamp-2 block text-sm leading-5", active ? "text-white/80" : "text-slate-500")}>
                    {service.description}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </section>

      <section className="mt-6">
        <SectionTitle icon={UserRound} label="Profissional" />
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {!selectedService && (
            <p className="rounded-[16px] bg-slate-100 px-4 py-3 text-sm font-medium text-slate-500">
              Escolha um servico para ver as profissionais.
            </p>
          )}
          {selectedService && !hasCompatibleProfessionals && (
            <p className="rounded-[16px] bg-slate-100 px-4 py-3 text-sm font-medium text-slate-500">
              Nenhuma profissional atende este servico.
            </p>
          )}
          {compatibleProfessionals.map((professional) => {
            const active = professional.id === professionalId;
            return (
              <button
                key={professional.id}
                type="button"
                className={cn(
                  "min-w-44 rounded-[18px] border px-4 py-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--booking-primary)]",
                  active
                    ? "border-[var(--booking-primary)] bg-[var(--booking-primary)] text-white"
                    : "border-blue-100 bg-white text-[var(--booking-text)] hover:border-[var(--booking-primary)] hover:bg-blue-50"
                )}
                onClick={() => setProfessionalId(professional.id)}
                aria-pressed={active}
              >
                <span className="flex items-center gap-2 font-semibold">
                  {active && <Check aria-hidden className="h-4 w-4" />}
                  {professional.name}
                </span>
                <span className={cn("mt-1 block truncate text-xs", active ? "text-white/75" : "text-slate-500")}>
                  {professional.specialties}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="mt-6">
        <SectionTitle icon={Clock3} label="Data e horario" />
        <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-7">
          {days.map((dayOption) => {
            const active = dayOption.value === date;
            return (
              <button
                key={dayOption.value}
                type="button"
                className={cn(
                  "rounded-[18px] border px-2 py-3 text-center transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--booking-primary)]",
                  active
                    ? "border-[var(--booking-primary)] bg-[var(--booking-primary)] text-white shadow-lg shadow-blue-500/20"
                    : "border-blue-100 bg-white text-[var(--booking-text)] hover:border-[var(--booking-primary)] hover:bg-blue-50"
                )}
                aria-label={dayOption.label}
                onClick={() => setDate(dayOption.value)}
                aria-pressed={active}
              >
                <span className={cn("block text-[11px] font-semibold uppercase", active ? "text-white/75" : "text-slate-500")}>
                  {dayOption.weekday}
                </span>
                <span className="mt-1 block text-xl font-semibold">{dayOption.day}</span>
                <span className={cn("block text-[11px] font-semibold uppercase", active ? "text-white/75" : "text-slate-400")}>
                  {dayOption.month}
                </span>
              </button>
            );
          })}
        </div>
        <label className="mt-3 block space-y-1.5 text-sm font-semibold text-[var(--booking-text)]">
          Outra data
          <Input
            type="date"
            value={date}
            min={firstDay}
            onChange={(event) => {
              setDate(event.target.value);
              setSlot("");
            }}
          />
        </label>

        <div className="mt-3 rounded-[20px] bg-slate-50 p-3">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-[var(--booking-text)]">
              {selectedDateLabel}
            </p>
            {loadingSlots && <Loader2 aria-hidden className="h-4 w-4 animate-spin text-[var(--booking-primary)]" />}
          </div>

          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
            {!loadingSlots && slots.length === 0 && (
              <p className="col-span-full rounded-[16px] bg-white px-4 py-4 text-center text-sm font-medium text-slate-500">
                {serviceId && professionalId ? "Sem horarios livres neste dia." : "Escolha servico e profissional para ver horarios."}
              </p>
            )}
            {slots.map((item) => {
              const active = item.startsAt === slot;
              return (
                <button
                  key={item.startsAt}
                  type="button"
                  className={cn(
                    "h-11 rounded-[14px] text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--booking-primary)]",
                    active
                      ? "bg-[var(--booking-accent)] text-white shadow-lg shadow-emerald-500/20"
                      : "bg-white text-[var(--booking-text)] hover:bg-[var(--booking-accent-soft)] hover:text-[var(--booking-accent)]"
                  )}
                  onClick={() => setSlot(item.startsAt)}
                  aria-pressed={active}
                >
                  {item.time}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <section className="mt-6">
        <SectionTitle icon={MessageCircle} label="Seus dados" />
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <label className="space-y-1.5 text-sm font-semibold text-[var(--booking-text)]">
            Nome
            <Input name="clientName" required autoComplete="name" placeholder="Ex.: Maria Silva" />
          </label>
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
        </div>
        <label className="mt-3 block space-y-1.5 text-sm font-semibold text-[var(--booking-text)]">
          Observacao
          <Textarea name="notes" autoComplete="off" placeholder="Opcional" className="min-h-20" />
        </label>
      </section>

      <div className="mt-5 rounded-[20px] border border-blue-100 bg-blue-50/60 p-3 text-sm text-[var(--booking-text)]">
        <p className="font-semibold">
          {selectedService?.name ?? "Servico"} {selectedProfessional ? `com ${selectedProfessional.name}` : ""}
        </p>
        <p className="mt-1 text-slate-600">
          {slot ? `Horario selecionado: ${new Date(slot).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}` : "Escolha um horario para continuar."}
        </p>
      </div>

      <Button className="mt-4 h-12 w-full gap-2 rounded-[16px] bg-[var(--booking-primary)] text-base hover:bg-[var(--booking-primary-dark)]" disabled={saving || !canSubmit}>
        {saving ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : <Send aria-hidden className="h-4 w-4" />}
        Confirmar
      </Button>

      {message && (
        <p
          aria-live="polite"
          className="mt-4 flex items-center gap-2 rounded-[16px] border border-emerald-100 bg-emerald-50 px-3 py-3 text-sm font-medium text-emerald-700"
        >
          <CheckCircle2 aria-hidden className="h-4 w-4" />
          <span>
            {message}
            {lookupCode && (
              <span className="mt-1 block text-[var(--booking-text)]">
                Codigo para consultar depois: <strong>{lookupCode}</strong>
              </span>
            )}
          </span>
        </p>
      )}
    </form>
  );
}

function ProgressSteps({ active }: { active: number }) {
  const steps = ["Servico", "Hora", "Dados"];

  return (
    <div className="grid grid-cols-3 gap-2">
      {steps.map((step, index) => {
        const done = index < active;
        return (
          <div
            key={step}
            className={cn(
              "flex min-w-0 items-center gap-2 rounded-[14px] px-2 py-2 text-sm font-semibold sm:px-3",
              done ? "bg-[var(--booking-accent-soft)] text-[var(--booking-accent)]" : "bg-slate-100 text-slate-500"
            )}
          >
            <span className={cn("flex h-6 w-6 items-center justify-center rounded-full text-xs", done ? "bg-[var(--booking-accent)] text-white" : "bg-white")}>
              {index + 1}
            </span>
            <span className="truncate">{step}</span>
          </div>
        );
      })}
    </div>
  );
}

function SectionTitle({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="flex h-9 w-9 items-center justify-center rounded-[13px] bg-blue-50 text-[var(--booking-primary)]">
        <Icon aria-hidden className="h-4 w-4" />
      </span>
      <h3 className="font-display text-lg font-semibold text-[var(--booking-text)]">{label}</h3>
    </div>
  );
}

function buildDayOptions(length: number): DayOption[] {
  return Array.from({ length }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() + index);
    const value = toDateValue(date);
    const weekday = date.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "");
    const month = date.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");
    return {
      value,
      weekday,
      day: String(date.getDate()).padStart(2, "0"),
      month,
      label: date.toLocaleDateString("pt-BR", {
        weekday: "long",
        day: "2-digit",
        month: "long"
      })
    };
  });
}

function formatDateLabel(value: string) {
  if (!value) return "Escolha uma data";
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return "Escolha uma data";
  return new Date(year, month - 1, day).toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long"
  });
}

function toDateValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
