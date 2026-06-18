import Link from "next/link";
import { revalidatePath } from "next/cache";
import {
  BadgeCheck,
  BellRing,
  CalendarClock,
  CheckCircle2,
  Clock3,
  MessageCircle,
  RotateCw,
  Search,
  XCircle
} from "lucide-react";
import type { ComponentType, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/lib/auth/session";
import { createNotificationLogs } from "@/lib/notifications/logs";
import { buildAppointmentMessages } from "@/lib/notifications/templates";
import { sendAppointmentNotifications } from "@/lib/notifications/whatsapp";
import { prisma } from "@/lib/prisma";
import { statusLabel } from "@/lib/utils";

export const dynamic = "force-dynamic";

type AppointmentStatus = "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED";
type SearchParams = Promise<Record<string, string | string[] | undefined>>;
type PeriodFilter = "today" | "upcoming" | "all";
type StatusFilter = AppointmentStatus | "ALL";
type Tone = "blue" | "green" | "amber" | "rose" | "sky";

const TIME_ZONE = "America/Fortaleza";
const BUSINESS_UTC_OFFSET_MS = 3 * 60 * 60 * 1000;
const statusOptions: Array<{ value: StatusFilter; label: string }> = [
  { value: "ALL", label: "Todos" },
  { value: "PENDING", label: "Pendentes" },
  { value: "CONFIRMED", label: "Confirmados" },
  { value: "COMPLETED", label: "Concluidos" },
  { value: "CANCELLED", label: "Cancelados" }
];
const periodOptions: Array<{ value: PeriodFilter; label: string }> = [
  { value: "upcoming", label: "Proximos" },
  { value: "today", label: "Hoje" },
  { value: "all", label: "Todos" }
];

const toneClasses: Record<Tone, string> = {
  blue: "bg-blue-50 text-[#0F5EF7]",
  green: "bg-emerald-50 text-[#22C55E]",
  amber: "bg-amber-50 text-amber-700",
  rose: "bg-rose-50 text-rose-700",
  sky: "bg-sky-50 text-[#38BDF8]"
};

const statusClasses: Record<AppointmentStatus, string> = {
  PENDING: "bg-amber-50 text-amber-700",
  CONFIRMED: "bg-blue-50 text-[#0F5EF7]",
  CANCELLED: "bg-rose-50 text-rose-700",
  COMPLETED: "bg-emerald-50 text-[#22C55E]"
};

async function updateAppointmentStatus(formData: FormData) {
  "use server";
  await requireAdmin();
  const appointment = await prisma.appointment.update({
    where: { id: String(formData.get("id")) },
    data: { status: String(formData.get("status")) as AppointmentStatus },
    include: { service: true, professional: true }
  });

  await notifyAppointment(appointment);

  revalidatePath("/admin/agendamentos");
  revalidatePath("/admin");
  revalidatePath("/admin/relatorios");
}

async function resendAppointmentNotifications(formData: FormData) {
  "use server";
  await requireAdmin();
  const appointment = await prisma.appointment.findUnique({
    where: { id: String(formData.get("id")) },
    include: { service: true, professional: true }
  });

  if (appointment) {
    await notifyAppointment(appointment);
  }

  revalidatePath("/admin/agendamentos");
  revalidatePath("/admin/relatorios");
}

async function notifyAppointment(appointment: {
  id: string;
  clientName: string;
  clientPhone: string;
  startsAt: Date;
  status: string;
  service: { name: string };
  professional: { name: string; phone: string };
}) {
  const messages = buildAppointmentMessages({
    clientName: appointment.clientName,
    clientPhone: appointment.clientPhone,
    professionalName: appointment.professional.name,
    professionalPhone: appointment.professional.phone,
    serviceName: appointment.service.name,
    startsAt: appointment.startsAt,
    status: appointment.status
  });
  const results = await sendAppointmentNotifications(messages);
  await createNotificationLogs({
    appointmentId: appointment.id,
    messages,
    results
  });
}

export default async function AppointmentsPage({ searchParams }: { searchParams?: SearchParams }) {
  const params = (await searchParams) ?? {};
  const status = parseStatus(getFirstValue(params.status));
  const period = parsePeriod(getFirstValue(params.period));
  const today = getBusinessDayRange(new Date());
  const where = buildAppointmentWhere(status, period, today);

  const [appointments, todayTotal, pendingTotal, confirmedTotal, completedTotal, cancelledTotal] = await Promise.all([
    prisma.appointment.findMany({
      where,
      include: {
        service: true,
        professional: true,
        notifications: {
          orderBy: { createdAt: "desc" },
          take: 3
        }
      },
      orderBy: [{ startsAt: "asc" }, { createdAt: "desc" }],
      take: 50
    }),
    prisma.appointment.count({ where: { startsAt: { gte: today.start, lte: today.end } } }),
    prisma.appointment.count({ where: { status: "PENDING" } }),
    prisma.appointment.count({ where: { status: "CONFIRMED" } }),
    prisma.appointment.count({ where: { status: "COMPLETED" } }),
    prisma.appointment.count({ where: { status: "CANCELLED" } })
  ]);

  return (
    <section className="space-y-6">
      <div className="rounded-[24px] border border-white bg-white/95 p-5 shadow-xl shadow-blue-950/5 md:p-6">
        <div className="grid gap-5 xl:grid-cols-[1fr_auto] xl:items-center">
          <div>
            <p className="text-sm font-semibold text-[#0F5EF7]">Agenda operacional</p>
            <h1 className="font-display mt-1 text-balance text-2xl font-semibold text-[#082F8B] md:text-3xl">
              Agendamentos
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Confirme, cancele, conclua e acompanhe notificacoes de WhatsApp em um fluxo mais rapido.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/agendar"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-[12px] border border-blue-100 bg-white px-4 text-sm font-semibold text-[#082F8B] transition hover:border-blue-200 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F5EF7] focus-visible:ring-offset-2"
            >
              <CalendarClock aria-hidden className="h-4 w-4" />
              Tela publica
            </Link>
            <Link
              href="/admin/relatorios"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-[12px] bg-[#0F5EF7] px-4 text-sm font-semibold text-white shadow-sm shadow-blue-500/20 transition hover:bg-[#0B4FD9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F5EF7] focus-visible:ring-offset-2"
            >
              <Search aria-hidden className="h-4 w-4" />
              Relatorios
            </Link>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard icon={CalendarClock} label="Hoje" value={todayTotal} helper="Agendamentos do dia" tone="blue" />
        <MetricCard icon={Clock3} label="Pendentes" value={pendingTotal} helper="Aguardando acao" tone="amber" />
        <MetricCard icon={BadgeCheck} label="Confirmados" value={confirmedTotal} helper="Na agenda ativa" tone="green" />
        <MetricCard icon={CheckCircle2} label="Concluidos" value={completedTotal} helper="Atendimentos feitos" tone="sky" />
        <MetricCard icon={XCircle} label="Cancelados" value={cancelledTotal} helper="Historico geral" tone="rose" />
      </div>

      <div className="rounded-[22px] border border-white bg-white/95 p-4 shadow-xl shadow-blue-950/5">
        <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
          <FilterGroup label="Periodo">
            {periodOptions.map((option) => (
              <FilterLink
                key={option.value}
                active={period === option.value}
                href={buildFilterHref({ status, period: option.value })}
              >
                {option.label}
              </FilterLink>
            ))}
          </FilterGroup>
          <FilterGroup label="Status">
            {statusOptions.map((option) => (
              <FilterLink
                key={option.value}
                active={status === option.value}
                href={buildFilterHref({ status: option.value, period })}
              >
                {option.label}
              </FilterLink>
            ))}
          </FilterGroup>
        </div>
      </div>

      <div className="rounded-[22px] border border-white bg-white/95 shadow-xl shadow-blue-950/5">
        <div className="border-b border-blue-50 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-xl font-semibold text-[#082F8B]">Lista de agendamentos</h2>
              <p className="mt-1 text-sm text-slate-500">
                Mostrando {appointments.length} registro(s) com os filtros atuais.
              </p>
            </div>
            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-[#0F5EF7]">
              Limite visual: 50 registros
            </span>
          </div>
        </div>

        <div className="divide-y divide-blue-50">
          {appointments.map((appointment) => (
            <AppointmentCard key={appointment.id} appointment={appointment} />
          ))}
          {appointments.length === 0 && (
            <div className="p-5">
              <p className="rounded-[16px] bg-[#F3F4F6] px-4 py-3 text-sm font-medium text-slate-500">
                Nenhum agendamento encontrado para esse filtro.
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function AppointmentCard({
  appointment
}: {
  appointment: {
    id: string;
    clientName: string;
    clientPhone: string;
    notes: string | null;
    startsAt: Date;
    status: AppointmentStatus;
    service: { name: string };
    professional: { name: string };
    notifications: Array<{ id: string; target: string; status: string; error: string | null; createdAt: Date }>;
  };
}) {
  const lastNotification = appointment.notifications[0];
  return (
    <article className="grid gap-4 p-5 xl:grid-cols-[minmax(0,1fr)_340px] xl:items-start">
      <div className="min-w-0">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-lg font-semibold text-[#082F8B]">
              {appointment.clientName} - {appointment.service.name}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              {appointment.professional.name} em {formatDateTime(appointment.startsAt)}
            </p>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClasses[appointment.status]}`}>
            {statusLabel(appointment.status)}
          </span>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          <InfoPill label="WhatsApp" value={appointment.clientPhone} />
          <InfoPill label="Horario" value={formatTime(appointment.startsAt)} />
          <InfoPill
            label="Notificacao"
            value={lastNotification ? (lastNotification.status === "SENT" ? "enviada" : "falhou") : "sem registro"}
          />
        </div>

        {appointment.notes && (
          <p className="mt-4 break-words rounded-[16px] bg-[#F3F4F6] px-4 py-3 text-sm leading-6 text-slate-600">
            {appointment.notes}
          </p>
        )}

        <div className="mt-4 space-y-1">
          {appointment.notifications.length === 0 ? (
            <p className="text-xs text-slate-400">Nenhuma tentativa de notificacao registrada.</p>
          ) : (
            appointment.notifications.map((notification) => (
              <p key={notification.id} className="break-words text-xs text-slate-500">
                {notification.target === "CLIENT" ? "Cliente" : "Profissional"}: {notification.status === "SENT" ? "enviado" : "falhou"}
                {notification.error ? ` - ${notification.error}` : ""}
              </p>
            ))
          )}
        </div>
      </div>

      <div className="rounded-[18px] border border-blue-50 bg-blue-50/35 p-3">
        <p className="mb-3 text-sm font-semibold text-[#082F8B]">Acoes do atendimento</p>
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
          <StatusAction id={appointment.id} status="CONFIRMED" icon={BadgeCheck} label="Confirmar" disabled={appointment.status === "CONFIRMED"} />
          <StatusAction id={appointment.id} status="COMPLETED" icon={CheckCircle2} label="Concluir" disabled={appointment.status === "COMPLETED"} />
          <CancelAction id={appointment.id} disabled={appointment.status === "CANCELLED"} />
          <form action={resendAppointmentNotifications}>
            <input type="hidden" name="id" value={appointment.id} />
            <Button className="w-full gap-2" variant="secondary">
              <RotateCw aria-hidden className="h-4 w-4" />
              Reenviar WhatsApp
            </Button>
          </form>
        </div>
      </div>
    </article>
  );
}

function StatusAction({
  id,
  status,
  icon: Icon,
  label,
  variant = "secondary",
  disabled = false
}: {
  id: string;
  status: AppointmentStatus;
  icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  label: string;
  variant?: "secondary" | "danger";
  disabled?: boolean;
}) {
  return (
    <form action={updateAppointmentStatus}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value={status} />
      <Button className="w-full gap-2" disabled={disabled} variant={variant}>
        <Icon aria-hidden className="h-4 w-4" />
        {label}
      </Button>
    </form>
  );
}

function CancelAction({ id, disabled = false }: { id: string; disabled?: boolean }) {
  if (disabled) {
    return (
      <Button className="w-full gap-2" disabled variant="danger">
        <XCircle aria-hidden className="h-4 w-4" />
        Cancelado
      </Button>
    );
  }

  return (
    <details className="rounded-[12px] bg-white">
      <summary className="flex h-10 cursor-pointer list-none items-center justify-center gap-2 rounded-[12px] bg-rose-500 px-4 text-sm font-semibold text-white shadow-sm shadow-rose-500/20 transition hover:bg-rose-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F5EF7] focus-visible:ring-offset-2">
        <XCircle aria-hidden className="h-4 w-4" />
        Cancelar
      </summary>
      <form action={updateAppointmentStatus} className="mt-2 rounded-[12px] border border-rose-100 bg-rose-50 p-2">
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="status" value="CANCELLED" />
        <p className="mb-2 text-xs font-medium text-rose-700">Confirme para avisar cliente e profissional.</p>
        <Button className="w-full gap-2" variant="danger">
          <XCircle aria-hidden className="h-4 w-4" />
          Confirmar cancelamento
        </Button>
      </form>
    </details>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  helper,
  tone
}: {
  icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  label: string;
  value: number;
  helper: string;
  tone: Tone;
}) {
  return (
    <div className="rounded-[20px] border border-white bg-white/95 p-5 shadow-lg shadow-blue-950/5">
      <span className={`flex h-11 w-11 items-center justify-center rounded-[14px] ${toneClasses[tone]}`}>
        <Icon aria-hidden className="h-5 w-5" />
      </span>
      <p className="mt-4 text-3xl font-semibold tabular-nums text-[#082F8B]">{value}</p>
      <p className="text-sm font-semibold text-[#082F8B]">{label}</p>
      <p className="mt-1 text-xs text-slate-500">{helper}</p>
    </div>
  );
}

function InfoPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-[14px] bg-[#F3F4F6] px-3 py-2">
      <p className="text-xs font-semibold uppercase text-slate-400">{label}</p>
      <p className="truncate text-sm font-semibold text-[#082F8B]">{value}</p>
    </div>
  );
}

function FilterGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-sm font-semibold text-[#082F8B]">{label}</p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function FilterLink({ active, href, children }: { active: boolean; href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className={
        active
          ? "rounded-full bg-[#0F5EF7] px-3 py-2 text-sm font-semibold text-white shadow-sm shadow-blue-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F5EF7] focus-visible:ring-offset-2"
          : "rounded-full border border-blue-100 bg-white px-3 py-2 text-sm font-semibold text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-[#0F5EF7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F5EF7] focus-visible:ring-offset-2"
      }
    >
      {children}
    </Link>
  );
}

function buildAppointmentWhere(status: StatusFilter, period: PeriodFilter, today: { start: Date; end: Date }) {
  const where: {
    status?: AppointmentStatus;
    startsAt?: { gte?: Date; lte?: Date };
  } = {};

  if (status !== "ALL") {
    where.status = status;
  }

  if (period === "today") {
    where.startsAt = { gte: today.start, lte: today.end };
  }

  if (period === "upcoming") {
    where.startsAt = { gte: today.start };
  }

  return where;
}

function buildFilterHref({ status, period }: { status: StatusFilter; period: PeriodFilter }) {
  const params = new URLSearchParams();
  params.set("period", period);
  if (status !== "ALL") params.set("status", status);
  return `/admin/agendamentos?${params.toString()}`;
}

function parseStatus(value: string | undefined): StatusFilter {
  if (value === "PENDING" || value === "CONFIRMED" || value === "CANCELLED" || value === "COMPLETED") {
    return value;
  }
  return "ALL";
}

function parsePeriod(value: string | undefined): PeriodFilter {
  if (value === "today" || value === "all") return value;
  return "upcoming";
}

function getFirstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function getBusinessDayRange(date: Date) {
  const key = toBusinessDateKey(date);
  return {
    start: new Date(`${key}T00:00:00-03:00`),
    end: new Date(`${key}T23:59:59.999-03:00`)
  };
}

function toBusinessDateKey(date: Date) {
  return new Date(date.getTime() - BUSINESS_UTC_OFFSET_MS).toISOString().slice(0, 10);
}

function formatDateTime(value: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: TIME_ZONE,
    dateStyle: "short",
    timeStyle: "short"
  }).format(value);
}

function formatTime(value: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit"
  }).format(value);
}
