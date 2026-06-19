"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
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
  isPast: boolean;
  isToday: boolean;
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
  const todayValue = useMemo(() => toDateValue(new Date()), []);
  const [monthCursor, setMonthCursor] = useState(() => startOfMonthDate(new Date()));
  const monthDays = useMemo(() => buildMonthOptions(monthCursor, todayValue), [monthCursor, todayValue]);
  const monthOffset = useMemo(() => getMonthStartOffset(monthCursor), [monthCursor]);

  const [serviceId, setServiceId] = useState("");
  const [professionalId, setProfessionalId] = useState("");
  const [date, setDate] = useState(todayValue);
  const [slot, setSlot] = useState("");
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [lookupCode, setLookupCode] = useState("");
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const servicesRef = useRef<HTMLDivElement>(null);
  const slotsRef = useRef<HTMLDivElement>(null);

  const selectedService = services.find((service) => service.id === serviceId);
  const selectedProfessional = professionals.find((professional) => professional.id === professionalId);
  const selectedDay = monthDays.find((day) => day.value === date);

  const compatibleServices = useMemo(() => {
    if (!selectedProfessional) return [];
    return services.filter((service) => selectedProfessional.serviceIds.includes(service.id));
  }, [selectedProfessional, services]);

  useEffect(() => {
    if (!professionalId) {
      setServiceId("");
      return;
    }
    const compatible = services.filter((service) => service.professionalIds.includes(professionalId));
    if (serviceId && !compatible.some((service) => service.id === serviceId)) {
      setServiceId("");
    }
  }, [professionalId, serviceId, services]);

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

  const hasCompatibleServices = Boolean(selectedProfessional && compatibleServices.length > 0);
  const canSubmit = Boolean(serviceId && professionalId && slot);
  const selectedDateLabel = selectedDay?.label ?? formatDateLabel(date);
  const canMoveToSchedule = Boolean(serviceId && professionalId);
  const monthLabel = formatMonthLabel(monthCursor);
  const isCurrentMonth = isSameYearMonth(monthCursor, new Date());

  return (
    <form action={handleSubmit} className="rounded-[28px] bg-[var(--booking-surface)] p-3 shadow-2xl shadow-blue-950/10 sm:p-4 md:p-6">
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

      <ProgressSteps
        active={currentStep}
        maxStep={canSubmit ? 3 : canMoveToSchedule ? 2 : 1}
        onSelect={(step) => setCurrentStep(step)}
      />

      {currentStep === 1 && (
      <>
      <section className="mt-5">
        <SectionTitle icon={UserRound} label="1. Profissional" />
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {professionals.length === 0 && (
            <p className="rounded-[16px] bg-slate-100 px-4 py-4 text-sm font-medium text-slate-500">
              Nenhuma profissional disponivel.
            </p>
          )}
          {professionals.map((professional) => {
            const active = professional.id === professionalId;
            return (
              <button
                key={professional.id}
                type="button"
                className={cn(
                  "min-h-24 rounded-[20px] border p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--booking-primary)]",
                  active
                    ? "border-[var(--booking-primary)] bg-[var(--booking-primary)] text-white shadow-lg shadow-blue-500/20"
                    : "border-blue-100 bg-white text-[var(--booking-text)] hover:border-[var(--booking-primary)] hover:bg-blue-50"
                )}
                onClick={() => {
                  setProfessionalId(professional.id);
                  setServiceId("");
                  setSlot("");
                  requestAnimationFrame(() => servicesRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
                }}
                aria-pressed={active}
              >
                <span className="flex items-start justify-between gap-3">
                  <span className="min-w-0">
                    <span className="flex items-center gap-2 text-base font-semibold">
                      {active && <Check aria-hidden className="h-4 w-4 shrink-0" />}
                      <span className="truncate">{professional.name}</span>
                    </span>
                    <span className={cn("mt-2 line-clamp-2 block text-sm leading-5", active ? "text-white/80" : "text-slate-500")}>
                      {professional.specialties}
                    </span>
                  </span>
                  <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold", active ? "bg-white/15" : "bg-blue-50 text-[var(--booking-primary)]")}>
                    {professional.serviceIds.length} serv.
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="mt-6" ref={servicesRef}>
        <SectionTitle icon={CalendarDays} label="Servico" />
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {!selectedProfessional && (
            <p className="rounded-[16px] bg-slate-100 px-4 py-3 text-sm font-medium text-slate-500">
              Escolha uma profissional para ver os servicos.
            </p>
          )}
          {selectedProfessional && !hasCompatibleServices && (
            <p className="rounded-[16px] bg-slate-100 px-4 py-3 text-sm font-medium text-slate-500">
              Nenhum servico vinculado a esta profissional.
            </p>
          )}
          {compatibleServices.map((service) => {
            const active = service.id === serviceId;
            return (
              <button
                key={service.id}
                type="button"
                className={cn(
                  "min-h-24 rounded-[18px] border px-4 py-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--booking-primary)]",
                  active
                    ? "border-[var(--booking-primary)] bg-[var(--booking-primary)] text-white"
                    : "border-blue-100 bg-white text-[var(--booking-text)] hover:border-[var(--booking-primary)] hover:bg-blue-50"
                )}
                onClick={() => {
                  setServiceId(service.id);
                  setSlot("");
                }}
                aria-pressed={active}
              >
                <span className="flex items-start justify-between gap-3">
                  <span className="min-w-0">
                    <span className="flex items-center gap-2 font-semibold">
                      {active && <Check aria-hidden className="h-4 w-4 shrink-0" />}
                      <span className="truncate">{service.name}</span>
                    </span>
                    <span className={cn("mt-1 block text-sm", active ? "text-white/75" : "text-slate-500")}>
                      {service.durationMinutes} min
                    </span>
                  </span>
                  <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold", active ? "bg-white/15" : "bg-blue-50 text-[var(--booking-primary)]")}>
                    {formatCurrency(service.priceCents)}
                  </span>
                </span>
                {service.description && (
                  <span className={cn("mt-2 line-clamp-2 block text-sm leading-5", active ? "text-white/80" : "text-slate-500")}>
                    {service.description}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <Button
          type="button"
          className="mt-5 h-12 w-full rounded-[16px] bg-[var(--booking-primary)] text-base hover:bg-[var(--booking-primary-dark)]"
          disabled={!canMoveToSchedule}
          onClick={() => setCurrentStep(2)}
        >
          Continuar para horarios
        </Button>
      </section>
      </>
      )}

      {currentStep === 2 && (
      <section className="mt-5">
        <SectionTitle icon={Clock3} label="2. Horarios" />
        <div className="-mx-3 mt-4 rounded-[22px] border border-blue-100 bg-white p-1 sm:mx-0 sm:p-3">
          <div className="mb-3 flex items-center justify-between gap-3">
            <button
              type="button"
              className="flex h-11 w-11 items-center justify-center rounded-[14px] border border-blue-100 text-[var(--booking-primary)] transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-40"
              disabled={isCurrentMonth}
              onClick={() => {
                const nextMonth = addMonths(monthCursor, -1);
                setMonthCursor(nextMonth);
                setDate(getFirstSelectableDate(nextMonth, todayValue));
                setSlot("");
              }}
              aria-label="Mes anterior"
            >
              <ChevronLeft aria-hidden className="h-5 w-5" />
            </button>
            <p className="text-center text-sm font-semibold capitalize text-[var(--booking-text)]">{monthLabel}</p>
            <button
              type="button"
              className="flex h-11 w-11 items-center justify-center rounded-[14px] border border-blue-100 text-[var(--booking-primary)] transition hover:bg-blue-50"
              onClick={() => {
                const nextMonth = addMonths(monthCursor, 1);
                setMonthCursor(nextMonth);
                setDate(getFirstSelectableDate(nextMonth, todayValue));
                setSlot("");
              }}
              aria-label="Proximo mes"
            >
              <ChevronRight aria-hidden className="h-5 w-5" />
            </button>
          </div>
          <div className="overflow-x-auto pb-1">
            <div className="grid min-w-[320px] grid-cols-7 gap-0.5 text-center text-[11px] font-semibold uppercase text-slate-400 sm:gap-1.5">
              {["D", "S", "T", "Q", "Q", "S", "S"].map((weekday, index) => (
                <span key={`${weekday}-${index}`}>{weekday}</span>
              ))}
            </div>
            <div className="mt-2 grid min-w-[320px] grid-cols-7 gap-0.5 sm:gap-1.5">
              {Array.from({ length: monthOffset }).map((_, index) => (
                <span key={`blank-${index}`} aria-hidden className="h-11" />
              ))}
              {monthDays.map((dayOption) => {
                const active = dayOption.value === date;
                return (
                  <button
                    key={dayOption.value}
                    type="button"
                    className={cn(
                      "min-h-12 rounded-[14px] border px-1 py-2 text-center transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--booking-primary)]",
                      dayOption.isPast
                        ? "cursor-not-allowed border-slate-100 bg-slate-100 text-slate-300"
                        : active
                        ? "border-[var(--booking-primary)] bg-[var(--booking-primary)] text-white shadow-lg shadow-blue-500/20"
                        : "border-blue-100 bg-white text-[var(--booking-text)] hover:border-[var(--booking-primary)] hover:bg-blue-50"
                    )}
                    aria-label={dayOption.label}
                    disabled={dayOption.isPast}
                    onClick={() => {
                      setDate(dayOption.value);
                      setSlot("");
                      requestAnimationFrame(() => slotsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
                    }}
                    aria-pressed={active}
                  >
                    <span className={cn("block text-[11px] font-semibold uppercase", active ? "text-white/75" : "text-slate-500")}>
                      {dayOption.weekday}
                    </span>
                    <span className="mt-1 block text-xl font-semibold">{dayOption.day}</span>
                    <span className={cn("block text-[10px] font-semibold uppercase", active ? "text-white/75" : dayOption.isToday ? "text-[var(--booking-primary)]" : "text-slate-400")}>
                      {dayOption.isToday ? "Hoje" : dayOption.month}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="mt-3 rounded-[20px] bg-slate-50 p-3" ref={slotsRef}>
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
        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          <Button type="button" variant="secondary" className="h-12 rounded-[16px]" onClick={() => setCurrentStep(1)}>
            Voltar
          </Button>
          <Button
            type="button"
            className="h-12 rounded-[16px] bg-[var(--booking-primary)] text-base hover:bg-[var(--booking-primary-dark)]"
            disabled={!slot}
            onClick={() => setCurrentStep(3)}
          >
            Continuar para meus dados
          </Button>
        </div>
      </section>
      )}

      {currentStep === 3 && (
      <>
      <BookingSummary
        serviceName={selectedService?.name}
        professionalName={selectedProfessional?.name}
        slot={slot}
      />
      <section className="mt-5">
        <SectionTitle icon={MessageCircle} label="3. Seus dados" />
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

      <Button type="button" variant="secondary" className="mt-4 h-12 w-full rounded-[16px]" onClick={() => setCurrentStep(2)}>
        Voltar para horarios
      </Button>
      <Button className="mt-4 h-12 w-full gap-2 rounded-[16px] bg-[var(--booking-primary)] text-base hover:bg-[var(--booking-primary-dark)]" disabled={saving || !canSubmit}>
        {saving ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : <Send aria-hidden className="h-4 w-4" />}
        Confirmar
      </Button>
      </>
      )}

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

function ProgressSteps({
  active,
  maxStep,
  onSelect
}: {
  active: 1 | 2 | 3;
  maxStep: 1 | 2 | 3;
  onSelect: (step: 1 | 2 | 3) => void;
}) {
  const steps: Array<{ id: 1 | 2 | 3; label: string }> = [
    { id: 1, label: "Prof." },
    { id: 2, label: "Hora" },
    { id: 3, label: "Dados" }
  ];

  return (
    <div className="grid grid-cols-3 gap-2">
      {steps.map((step) => {
        const selected = step.id === active;
        const done = step.id < active;
        const disabled = step.id > maxStep;
        return (
          <button
            key={step.id}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(step.id)}
            className={cn(
              "flex min-h-11 min-w-0 touch-manipulation items-center gap-2 rounded-[14px] px-2 py-2 text-left text-sm font-semibold transition sm:px-3",
              selected
                ? "bg-[var(--booking-primary)] text-white shadow-lg shadow-blue-500/15"
                : done
                ? "bg-[var(--booking-accent-soft)] text-[var(--booking-accent)]"
                : "bg-slate-100 text-slate-500",
              disabled && "cursor-not-allowed opacity-60"
            )}
          >
            <span
              className={cn(
                "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs",
                selected ? "bg-white text-[var(--booking-primary)]" : done ? "bg-[var(--booking-accent)] text-white" : "bg-white"
              )}
            >
              {step.id}
            </span>
            <span className="truncate">{step.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function BookingSummary({
  serviceName,
  professionalName,
  slot
}: {
  serviceName: string | undefined;
  professionalName: string | undefined;
  slot: string;
}) {
  return (
    <div className="mt-5 rounded-[20px] border border-blue-100 bg-blue-50/60 p-3 text-sm text-[var(--booking-text)]">
      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--booking-primary)]">Resumo</p>
      <p className="mt-1 font-semibold">
        {professionalName ?? "Profissional"} {serviceName ? `- ${serviceName}` : ""}
      </p>
      <p className="mt-1 text-slate-600">
        {slot ? `Horario: ${formatSlotLabel(slot)}` : "Escolha um horario para continuar."}
      </p>
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

function buildMonthOptions(month: Date, todayValue: string): DayOption[] {
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  return Array.from({ length: daysInMonth }, (_, index) => {
    const date = new Date(month.getFullYear(), month.getMonth(), index + 1);
    const value = toDateValue(date);
    const weekday = date.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "");
    const monthText = date.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");
    return {
      value,
      weekday,
      day: String(date.getDate()).padStart(2, "0"),
      month: monthText,
      label: date.toLocaleDateString("pt-BR", {
        weekday: "long",
        day: "2-digit",
        month: "long"
      }),
      isPast: value < todayValue,
      isToday: value === todayValue
    };
  });
}

function startOfMonthDate(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, months: number) {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

function getMonthStartOffset(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
}

function getFirstSelectableDate(month: Date, todayValue: string) {
  const firstDay = toDateValue(startOfMonthDate(month));
  return firstDay < todayValue ? todayValue : firstDay;
}

function isSameYearMonth(date: Date, compare: Date) {
  return date.getFullYear() === compare.getFullYear() && date.getMonth() === compare.getMonth();
}

function formatMonthLabel(date: Date) {
  return date.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
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

function formatSlotLabel(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (match) {
    const [, year, month, day, hour, minute] = match;
    return `${day}/${month}/${year}, ${hour}:${minute}`;
  }
  return new Date(value).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

function toDateValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
