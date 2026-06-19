import Link from "next/link";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import {
  AlertTriangle,
  BadgeCheck,
  BellRing,
  CalendarDays,
  CalendarClock,
  CheckCircle2,
  Clock3,
  MessageCircle,
  Phone,
  RotateCw,
  Search,
  UserRound,
  XCircle
} from "lucide-react";
import type { ComponentType, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/lib/auth/session";
import { getWhatsappConnectionState } from "@/lib/notifications/baileys-manager";
import { createNotificationLogs } from "@/lib/notifications/logs";
import { buildAppointmentMessages } from "@/lib/notifications/templates";
import { sendAppointmentNotifications } from "@/lib/notifications/whatsapp";
import { prisma } from "@/lib/prisma";
import { statusLabel } from "@/lib/utils";
import { AppointmentActionButton } from "./appointment-action-button";

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
const whatsappDisconnectedMessage = "WhatsApp desconectado. O status foi alterado, mas a notificacao nao foi enviada.";
const appointmentStatuses: AppointmentStatus[] = ["PENDING", "CONFIRMED", "CANCELLED", "COMPLETED"];

async function updateAppointmentStatus(formData: FormData) {
  "use server";
  await requireAdmin();

  const id = parseActionId(formData.get("id"));
  const nextStatus = parseActionStatus(formData.get("status"));
  if (!id || !nextStatus) return;

  const currentAppointment = await prisma.appointment.findUnique({
    where: { id },
    select: { status: true }
  });

  if (!currentAppointment || currentAppointment.status === nextStatus || !canTransitionStatus(currentAppointment.status, nextStatus)) {
    return;
  }

  const appointment = await prisma.appointment.update({
    where: { id },
    data: { status: nextStatus },
    include: { service: true, professional: true }
  });

  queueAppointmentNotification(appointment);

  revalidatePath("/admin/agendamentos");
  revalidatePath("/admin");
  revalidatePath("/admin/relatorios");
}

async function resendAppointmentNotifications(formData: FormData) {
  "use server";
  await requireAdmin();
  const id = parseActionId(formData.get("id"));
  if (!id) return;

  const appointment = await prisma.appointment.findUnique({
    where: { id },
    include: { service: true, professional: true }
  });

  if (appointment) {
    queueAppointmentNotification(appointment);
  }

  revalidatePath("/admin/agendamentos");
  revalidatePath("/admin/relatorios");
}

function queueAppointmentNotification(appointment: {
  id: string;
  clientName: string;
  clientPhone: string;
  startsAt: Date;
  status: string;
  service: { name: string };
  professional: { name: string; phone: string };
}) {
  after(async () => {
    try {
      await notifyAppointment(appointment);
      revalidatePath("/admin/agendamentos");
      revalidatePath("/admin/relatorios");
    } catch (error) {
      console.error("[appointments] falha ao processar notificacao", error);
    }
  });
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

  if (process.env.WHATSAPP_MODE === "baileys" && getWhatsappConnectionState().status !== "CONNECTED") {
    await createNotificationLogs({
      appointmentId: appointment.id,
      messages,
      results: [
        { target: "client", ok: false, error: whatsappDisconnectedMessage },
        { target: "professional", ok: false, error: whatsappDisconnectedMessage }
      ]
    });
    return;
  }

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
  const now = new Date();
  const today = getBusinessDayRange(now);
  const nextHourEnd = new Date(now.getTime() + 60 * 60 * 1000);
  const where = buildAppointmentWhere(status, period, today);
  const whatsappState = getWhatsappConnectionState();

  const [appointments, todayTotal, statusCounts, nextAppointment, nextHourTotal, failedNotificationTotal] = await Promise.all([
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
    prisma.appointment.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.appointment.findFirst({
      where: {
        startsAt: { gte: now },
        status: { not: "CANCELLED" }
      },
      include: { service: true, professional: true },
      orderBy: { startsAt: "asc" }
    }),
    prisma.appointment.count({
      where: {
        startsAt: { gte: now, lte: nextHourEnd },
        status: { not: "CANCELLED" }
      }
    }),
    prisma.notificationLog.count({ where: { status: "FAILED" } })
  ]);
  const pendingTotal = getStatusCount(statusCounts, "PENDING");
  const confirmedTotal = getStatusCount(statusCounts, "CONFIRMED");
  const completedTotal = getStatusCount(statusCounts, "COMPLETED");
  const cancelledTotal = getStatusCount(statusCounts, "CANCELLED");
  const activeCount = confirmedTotal + completedTotal;

  return (
    <section className="space-y-6">
      <div className="overflow-hidden rounded-[24px] border border-white bg-white/95 shadow-xl shadow-blue-950/5">
        <div className="grid gap-5 p-5 md:p-6 2xl:grid-cols-[1fr_auto] 2xl:items-center">
          <div>
            <p className="text-sm font-semibold text-[#0F5EF7]">Agenda operacional</p>
            <h1 className="font-display mt-1 text-balance text-2xl font-semibold text-[#082F8B] md:text-3xl">
              Fila de agendamentos
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Priorize pendencias, acompanhe o proximo atendimento e altere status sem depender do WhatsApp conectado.
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 2xl:w-[420px]">
            <StatusPill icon={CalendarDays} label="Hoje" value={formatLongDate(now)} tone="blue" />
            <StatusPill
              icon={MessageCircle}
              label="WhatsApp"
              value={whatsappState.status === "CONNECTED" ? "Conectado" : "Atencao"}
              tone={whatsappState.status === "CONNECTED" ? "green" : "amber"}
            />
          </div>
        </div>
        <div className="grid gap-3 border-t border-blue-50 bg-blue-50/35 p-4 md:grid-cols-[1fr_auto] md:items-center">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase text-slate-500">Proximo atendimento</p>
            <p className="mt-1 break-words text-sm font-semibold text-[#082F8B]">
              {nextAppointment
                ? `${formatDateTime(nextAppointment.startsAt)} - ${nextAppointment.clientName} (${nextAppointment.service.name})`
                : "Nenhum atendimento futuro ativo."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/agendar"
              className="inline-flex h-11 min-h-11 touch-manipulation items-center justify-center gap-2 rounded-[12px] border border-blue-100 bg-white px-4 text-sm font-semibold text-[#082F8B] transition hover:border-blue-200 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F5EF7] focus-visible:ring-offset-2"
            >
              <CalendarClock aria-hidden className="h-4 w-4" />
              Tela publica
            </Link>
            <Link
              href="/admin/relatorios"
              className="inline-flex h-11 min-h-11 touch-manipulation items-center justify-center gap-2 rounded-[12px] bg-[#0F5EF7] px-4 text-sm font-semibold text-white shadow-sm shadow-blue-500/20 transition hover:bg-[#0B4FD9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F5EF7] focus-visible:ring-offset-2"
            >
              <Search aria-hidden className="h-4 w-4" />
              Relatorios
            </Link>
          </div>
        </div>
      </div>

      {process.env.WHATSAPP_MODE === "baileys" && whatsappState.status !== "CONNECTED" && (
        <div className="flex gap-3 rounded-[18px] border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-800 shadow-sm shadow-amber-500/10">
          <BellRing aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            O status dos agendamentos muda normalmente. Como o WhatsApp nao esta conectado, as notificacoes ficam registradas como falha e podem ser reenviadas depois.
          </p>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
        <MetricCard href={buildFilterHref({ status: "PENDING", period })} icon={Clock3} label="Pendentes" value={pendingTotal} helper="Para confirmar" tone="amber" />
        <MetricCard href={buildFilterHref({ status, period: "today" })} icon={CalendarClock} label="Hoje" value={todayTotal} helper="Agenda do dia" tone="blue" />
        <MetricCard icon={AlertTriangle} label="Proximos 60 min" value={nextHourTotal} helper="Atencao imediata" tone="rose" />
        <MetricCard icon={MessageCircle} label="WhatsApp falhou" value={failedNotificationTotal} helper="Reenvio manual" tone="amber" />
        <MetricCard href={buildFilterHref({ status: "CONFIRMED", period })} icon={BadgeCheck} label="Ativos" value={activeCount} helper={`${confirmedTotal} confirmados`} tone="green" />
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

      <div className="overflow-hidden rounded-[22px] border border-white bg-white/95 shadow-xl shadow-blue-950/5">
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
  const notificationStatus = getNotificationSummary(lastNotification);
  const canConfirm = canTransitionStatus(appointment.status, "CONFIRMED");
  const canComplete = canTransitionStatus(appointment.status, "COMPLETED");
  const canCancel = canTransitionStatus(appointment.status, "CANCELLED");
  return (
    <article className="grid gap-4 p-4 sm:p-5 2xl:grid-cols-[minmax(0,1fr)_300px] 2xl:items-start">
      <div className="min-w-0">
        <div className="grid gap-3 lg:grid-cols-[96px_minmax(0,1fr)_auto] lg:items-start">
          <div className="rounded-[16px] bg-blue-50 px-3 py-3 text-[#082F8B]">
            <p className="text-xs font-semibold uppercase text-[#0F5EF7]">{formatDateShort(appointment.startsAt)}</p>
            <p className="mt-1 text-2xl font-semibold leading-none tabular-nums">{formatTime(appointment.startsAt)}</p>
          </div>
          <div className="min-w-0">
            <p className="break-words text-lg font-semibold leading-snug text-[#082F8B]">
              {appointment.clientName}
            </p>
            <p className="mt-1 break-words text-sm font-semibold text-slate-600">{appointment.service.name}</p>
            <p className="mt-1 flex min-w-0 items-center gap-1.5 break-words text-sm text-slate-500">
              <UserRound aria-hidden className="h-4 w-4 shrink-0" />
              {appointment.professional.name}
            </p>
          </div>
          <span className={`w-fit rounded-full px-3 py-1 text-xs font-semibold ${statusClasses[appointment.status]}`}>
            {statusLabel(appointment.status)}
          </span>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <InfoPill icon={Phone} label="WhatsApp" value={appointment.clientPhone} />
          <InfoPill icon={CalendarClock} label="Data completa" value={formatDateTime(appointment.startsAt)} />
          <InfoPill icon={MessageCircle} label="Notificacao" value={notificationStatus.label} tone={notificationStatus.tone} />
        </div>

        {appointment.notes && (
          <p className="mt-4 break-words rounded-[16px] bg-[#F3F4F6] px-4 py-3 text-sm leading-6 text-slate-600">
            {appointment.notes}
          </p>
        )}

        <details className="mt-4 rounded-[16px] bg-[#F3F4F6] px-4 py-3">
          <summary className="cursor-pointer list-none text-sm font-semibold text-[#082F8B]">
            Historico de WhatsApp
          </summary>
          <div className="mt-2 space-y-1">
          {appointment.notifications.length === 0 ? (
            <p className="text-xs text-slate-400">Nenhuma tentativa de notificacao registrada.</p>
          ) : (
            appointment.notifications.map((notification) => (
              <p key={notification.id} className="line-clamp-2 break-words text-xs text-slate-500">
                {notification.target === "CLIENT" ? "Cliente" : "Profissional"}: {notification.status === "SENT" ? "enviado" : "falhou"}
                {notification.error ? ` - ${notification.error}` : ""}
              </p>
            ))
          )}
          </div>
        </details>
      </div>

      <div className="rounded-[18px] border border-blue-50 bg-blue-50/35 p-3">
        <p className="mb-1 text-sm font-semibold text-[#082F8B]">Acoes do atendimento</p>
        <p className="mb-3 text-xs leading-5 text-slate-500">O status muda na hora; WhatsApp pode ser reenviado depois.</p>
        <div className="grid gap-2 lg:grid-cols-2 2xl:grid-cols-1">
          <StatusAction id={appointment.id} status="CONFIRMED" icon={BadgeCheck} label="Confirmar" disabled={!canConfirm} variant={appointment.status === "PENDING" ? "primary" : "secondary"} />
          <StatusAction id={appointment.id} status="COMPLETED" icon={CheckCircle2} label="Concluir" disabled={!canComplete} variant={appointment.status === "CONFIRMED" ? "success" : "secondary"} />
          <CancelAction id={appointment.id} disabled={!canCancel} />
          <form action={resendAppointmentNotifications}>
            <input type="hidden" name="id" value={appointment.id} />
            <AppointmentActionButton pendingLabel="Reenviando..." variant={lastNotification?.status === "FAILED" ? "primary" : "secondary"}>
              <RotateCw aria-hidden className="h-4 w-4" />
              Reenviar WhatsApp
            </AppointmentActionButton>
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
  variant?: "primary" | "secondary" | "success" | "danger";
  disabled?: boolean;
}) {
  return (
    <form action={updateAppointmentStatus}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value={status} />
      <AppointmentActionButton disabled={disabled} pendingLabel="Salvando..." variant={variant}>
        <Icon aria-hidden className="h-4 w-4" />
        {label}
      </AppointmentActionButton>
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
      <summary className="flex h-11 min-h-11 cursor-pointer list-none touch-manipulation items-center justify-center gap-2 rounded-[12px] bg-rose-500 px-4 text-sm font-semibold text-white shadow-sm shadow-rose-500/20 transition hover:bg-rose-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F5EF7] focus-visible:ring-offset-2">
        <XCircle aria-hidden className="h-4 w-4" />
        Cancelar
      </summary>
      <form action={updateAppointmentStatus} className="mt-2 rounded-[12px] border border-rose-100 bg-rose-50 p-2">
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="status" value="CANCELLED" />
        <p className="mb-2 text-xs font-medium text-rose-700">Cancela o agendamento e registra tentativa de aviso.</p>
        <AppointmentActionButton pendingLabel="Cancelando..." variant="danger">
          <XCircle aria-hidden className="h-4 w-4" />
          Confirmar cancelamento
        </AppointmentActionButton>
      </form>
    </details>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  helper,
  tone,
  href
}: {
  icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  label: string;
  value: number;
  helper: string;
  tone: Tone;
  href?: string;
}) {
  const content = (
    <>
      <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-[15px] ${toneClasses[tone]}`}>
        <Icon aria-hidden className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="text-3xl font-semibold leading-none tabular-nums text-[#082F8B]">{value}</p>
        <p className="mt-1 truncate text-sm font-semibold text-[#082F8B]">{label}</p>
        <p className="mt-0.5 truncate text-xs text-slate-500">{helper}</p>
      </div>
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="flex min-w-0 items-center gap-4 rounded-[20px] border border-white bg-white/95 p-4 shadow-lg shadow-blue-950/5 transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-blue-950/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F5EF7] focus-visible:ring-offset-2"
      >
        {content}
      </Link>
    );
  }

  return (
    <div className="flex min-w-0 items-center gap-4 rounded-[20px] border border-white bg-white/95 p-4 shadow-lg shadow-blue-950/5">
      {content}
    </div>
  );
}

function StatusPill({
  icon: Icon,
  label,
  value,
  tone
}: {
  icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  label: string;
  value: string;
  tone: Tone;
}) {
  return (
    <div className="flex min-w-0 items-center gap-3 rounded-[16px] bg-[#F3F4F6] px-3 py-3">
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] ${toneClasses[tone]}`}>
        <Icon aria-hidden className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase text-slate-500">{label}</p>
        <p className="truncate text-sm font-semibold text-[#082F8B]">{value}</p>
      </div>
    </div>
  );
}

function InfoPill({
  icon: Icon,
  label,
  value,
  tone = "neutral"
}: {
  icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  label: string;
  value: string;
  tone?: "neutral" | "success" | "danger";
}) {
  const toneClass = {
    neutral: "bg-[#F3F4F6] text-[#082F8B]",
    success: "bg-emerald-50 text-emerald-700",
    danger: "bg-rose-50 text-rose-700"
  }[tone];

  return (
    <div className={`flex min-w-0 items-center gap-2 rounded-[14px] px-3 py-2 ${toneClass}`}>
      <Icon aria-hidden className="h-4 w-4 shrink-0" />
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase opacity-70">{label}</p>
        <p className="truncate text-sm font-semibold">{value}</p>
      </div>
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
      aria-current={active ? "page" : undefined}
      className={
        active
          ? "inline-flex min-h-11 touch-manipulation items-center rounded-full bg-[#0F5EF7] px-3 py-2 text-sm font-semibold text-white shadow-sm shadow-blue-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F5EF7] focus-visible:ring-offset-2"
          : "inline-flex min-h-11 touch-manipulation items-center rounded-full border border-blue-100 bg-white px-3 py-2 text-sm font-semibold text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-[#0F5EF7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F5EF7] focus-visible:ring-offset-2"
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

function parseActionId(value: FormDataEntryValue | null) {
  const id = String(value ?? "").trim();
  return id.length > 0 && id.length <= 128 ? id : null;
}

function parseActionStatus(value: FormDataEntryValue | null): AppointmentStatus | null {
  const status = String(value ?? "");
  return appointmentStatuses.includes(status as AppointmentStatus) ? (status as AppointmentStatus) : null;
}

function canTransitionStatus(current: AppointmentStatus, next: AppointmentStatus) {
  if (current === next) return false;

  const allowedTransitions: Record<AppointmentStatus, AppointmentStatus[]> = {
    PENDING: ["CONFIRMED", "CANCELLED"],
    CONFIRMED: ["COMPLETED", "CANCELLED"],
    CANCELLED: [],
    COMPLETED: []
  };

  return allowedTransitions[current].includes(next);
}

function getStatusCount(
  rows: Array<{
    status: AppointmentStatus;
    _count: { _all: number };
  }>,
  status: AppointmentStatus
) {
  return rows.find((row) => row.status === status)?._count._all ?? 0;
}

function getNotificationSummary(notification: { status: string; error: string | null } | undefined) {
  if (!notification) return { label: "sem registro", tone: "neutral" as const };
  if (notification.status === "SENT") return { label: "enviada", tone: "success" as const };
  return { label: "falhou", tone: "danger" as const };
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

function formatLongDate(value: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: TIME_ZONE,
    weekday: "short",
    day: "2-digit",
    month: "2-digit"
  }).format(value);
}

function formatDateShort(value: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: TIME_ZONE,
    day: "2-digit",
    month: "2-digit"
  }).format(value);
}

function formatTime(value: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit"
  }).format(value);
}
