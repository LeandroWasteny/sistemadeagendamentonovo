import Link from "next/link";
import {
  AlertTriangle,
  BarChart3,
  CalendarCheck,
  CalendarClock,
  CheckCircle2,
  Clock,
  MessageCircle,
  PlusCircle,
  Scissors,
  Settings2,
  TrendingUp,
  Users
} from "lucide-react";
import type { ComponentType, ReactNode } from "react";
import { getWhatsappConnectionState } from "@/lib/notifications/baileys-manager";
import { prisma } from "@/lib/prisma";
import { statusLabel } from "@/lib/utils";

export const dynamic = "force-dynamic";

const TIME_ZONE = "America/Fortaleza";
const BUSINESS_UTC_OFFSET_MS = 3 * 60 * 60 * 1000;

type Tone = "blue" | "green" | "amber" | "rose" | "sky";

const toneClasses: Record<Tone, string> = {
  blue: "bg-blue-50 text-[#0F5EF7]",
  green: "bg-emerald-50 text-[#22C55E]",
  amber: "bg-amber-50 text-amber-700",
  rose: "bg-rose-50 text-rose-700",
  sky: "bg-sky-50 text-[#38BDF8]"
};

const statusClasses: Record<string, string> = {
  PENDING: "bg-amber-50 text-amber-700",
  CONFIRMED: "bg-blue-50 text-[#0F5EF7]",
  CANCELLED: "bg-rose-50 text-rose-700",
  COMPLETED: "bg-emerald-50 text-[#22C55E]"
};

export default async function AdminDashboard() {
  const now = new Date();
  const today = getBusinessDayRange(now);
  const weekEnd = addDays(today.start, 7);

  const [
    todayAppointments,
    upcomingAppointments,
    pendingTotal,
    activeServices,
    activeProfessionals,
    servicesWithoutProfessionals,
    professionalsWithoutSchedules,
    professionalsWithoutServices,
    weekAppointments
  ] = await Promise.all([
    prisma.appointment.findMany({
      where: { startsAt: { gte: today.start, lte: today.end } },
      include: { service: true, professional: true },
      orderBy: { startsAt: "asc" }
    }),
    prisma.appointment.findMany({
      where: {
        startsAt: { gte: now, lte: weekEnd },
        status: { not: "CANCELLED" }
      },
      include: { service: true, professional: true },
      orderBy: { startsAt: "asc" },
      take: 6
    }),
    prisma.appointment.count({ where: { status: "PENDING" } }),
    prisma.service.count({ where: { active: true } }),
    prisma.professional.count({ where: { active: true } }),
    prisma.service.count({
      where: {
        active: true,
        professionals: { none: { professional: { active: true } } }
      }
    }),
    prisma.professional.count({
      where: {
        active: true,
        schedules: { none: { active: true } }
      }
    }),
    prisma.professional.count({
      where: {
        active: true,
        services: { none: { service: { active: true } } }
      }
    }),
    prisma.appointment.findMany({
      where: { startsAt: { gte: today.start, lte: weekEnd } },
      select: { startsAt: true, status: true },
      orderBy: { startsAt: "asc" }
    })
  ]);

  const whatsappState = getWhatsappConnectionState();
  const todayPending = todayAppointments.filter((appointment) => appointment.status === "PENDING").length;
  const todayConfirmed = todayAppointments.filter((appointment) => appointment.status === "CONFIRMED").length;
  const todayCompleted = todayAppointments.filter((appointment) => appointment.status === "COMPLETED").length;
  const todayCancelled = todayAppointments.filter((appointment) => appointment.status === "CANCELLED").length;
  const activeToday = todayConfirmed + todayCompleted;
  const uniqueClientsToday = new Set(todayAppointments.map((appointment) => appointment.clientPhone)).size;

  const attentionItems = [
    {
      show: pendingTotal > 0,
      title: `${pendingTotal} agendamento(s) pendente(s)`,
      description: "Confirme ou cancele para manter a agenda organizada.",
      href: "/admin/agendamentos",
      tone: "amber" as Tone,
      icon: Clock
    },
    {
      show: whatsappState.status !== "CONNECTED",
      title: "WhatsApp precisa de atencao",
      description: whatsappState.status === "QR_READY" ? "QR Code pronto para leitura." : "Conecte para enviar notificacoes.",
      href: "/admin/whatsapp",
      tone: "rose" as Tone,
      icon: MessageCircle
    },
    {
      show: servicesWithoutProfessionals > 0,
      title: `${servicesWithoutProfessionals} servico(s) sem profissional`,
      description: "Vincule profissionais para liberar o agendamento publico.",
      href: "/admin/servicos",
      tone: "amber" as Tone,
      icon: Scissors
    },
    {
      show: professionalsWithoutSchedules > 0,
      title: `${professionalsWithoutSchedules} profissional(is) sem horario`,
      description: "Cadastre disponibilidade para abrir vagas aos clientes.",
      href: "/admin/horarios",
      tone: "amber" as Tone,
      icon: CalendarClock
    },
    {
      show: professionalsWithoutServices > 0,
      title: `${professionalsWithoutServices} profissional(is) sem servico`,
      description: "Defina quais servicos cada profissional atende.",
      href: "/admin/profissionais",
      tone: "amber" as Tone,
      icon: Users
    }
  ].filter((item) => item.show);

  const weekRows = buildWeekRows(today.start, weekAppointments);
  const maxWeekCount = Math.max(1, ...weekRows.map((row) => row.total));

  return (
    <section className="space-y-6">
      <div className="overflow-hidden rounded-[24px] border border-white bg-white/95 shadow-xl shadow-blue-950/5">
        <div className="grid gap-5 p-5 md:p-6 xl:grid-cols-[1fr_auto] xl:items-center">
          <div>
            <p className="text-sm font-semibold text-[#0F5EF7]">Agenda Pra Ja</p>
            <h1 className="font-display mt-1 text-balance text-2xl font-semibold text-[#082F8B] md:text-3xl">
              Painel de controle do dia
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Veja o que acontece hoje, acompanhe pendencias e acesse rapidamente as areas mais usadas.
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 xl:w-[360px]">
            <StatusPill icon={CalendarCheck} label="Hoje" value={formatLongDate(now)} tone="blue" />
            <StatusPill
              icon={MessageCircle}
              label="WhatsApp"
              value={whatsappState.status === "CONNECTED" ? "Conectado" : "Atencao"}
              tone={whatsappState.status === "CONNECTED" ? "green" : "amber"}
            />
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard href="/admin/agendamentos" icon={CalendarClock} label="Agendamentos Hoje" value={todayAppointments.length} helper={`${activeToday} ativo(s)`} tone="blue" />
        <MetricCard href="/admin/agendamentos" icon={Clock} label="Pendentes" value={todayPending} helper={`${pendingTotal} no total`} tone="amber" />
        <MetricCard href="/admin/agendamentos" icon={CheckCircle2} label="Confirmados" value={todayConfirmed} helper="Para atender hoje" tone="green" />
        <MetricCard href="/admin/agendamentos" icon={TrendingUp} label="Concluidos" value={todayCompleted} helper={`${todayCancelled} cancelado(s)`} tone="sky" />
        <MetricCard href="/admin/profissionais" icon={Users} label="Clientes Hoje" value={uniqueClientsToday} helper={`${activeProfessionals} profissional(is) ativa(s)`} tone="green" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <Panel title="Atencao Necessaria" icon={AlertTriangle} actionHref="/admin/relatorios" actionLabel="Ver relatorios">
          {attentionItems.length > 0 ? (
            <div className="space-y-3">
              {attentionItems.map((item) => (
                <AttentionLink key={item.title} {...item} />
              ))}
            </div>
          ) : (
            <div className="rounded-[16px] bg-emerald-50 px-4 py-4 text-sm font-semibold text-[#22C55E]">
              Tudo certo para operar hoje.
            </div>
          )}
        </Panel>

        <Panel title="Proximos Atendimentos" icon={CalendarClock} actionHref="/admin/agendamentos" actionLabel="Abrir agenda">
          {upcomingAppointments.length > 0 ? (
            <div className="divide-y divide-blue-50">
              {upcomingAppointments.map((appointment) => (
                <AppointmentRow key={appointment.id} appointment={appointment} />
              ))}
            </div>
          ) : (
            <EmptyState>Nenhum atendimento futuro encontrado.</EmptyState>
          )}
        </Panel>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <Panel title="Resumo dos Proximos 7 Dias" icon={BarChart3} actionHref="/admin/relatorios" actionLabel="Detalhar">
          <div className="space-y-3">
            {weekRows.map((row) => (
              <WeeklyRow key={row.key} row={row} max={maxWeekCount} />
            ))}
          </div>
        </Panel>

        <Panel title="Atalhos Rapidos" icon={Settings2}>
          <div className="grid gap-3">
            <QuickLink href="/admin/agendamentos" icon={CalendarCheck} label="Gerenciar agendamentos" />
            <QuickLink href="/admin/horarios" icon={CalendarClock} label="Ajustar horarios" />
            <QuickLink href="/admin/profissionais" icon={Users} label="Adicionar profissional" />
            <QuickLink href="/admin/servicos" icon={PlusCircle} label="Criar servico" />
            <QuickLink href="/admin/whatsapp" icon={MessageCircle} label="Conectar WhatsApp" />
          </div>
        </Panel>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <MiniStat label="Servicos ativos" value={activeServices} href="/admin/servicos" />
        <MiniStat label="Profissionais ativas" value={activeProfessionals} href="/admin/profissionais" />
        <MiniStat label="Agendamentos na semana" value={weekAppointments.length} href="/admin/relatorios" />
      </div>
    </section>
  );
}

function MetricCard({
  href,
  icon: Icon,
  label,
  value,
  helper,
  tone
}: {
  href: string;
  icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  label: string;
  value: number | string;
  helper: string;
  tone: Tone;
}) {
  return (
    <Link
      href={href}
      className="group rounded-[20px] border border-white bg-white/95 p-5 shadow-lg shadow-blue-950/5 transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-blue-950/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F5EF7] focus-visible:ring-offset-2"
    >
      <span className={`flex h-11 w-11 items-center justify-center rounded-[14px] ${toneClasses[tone]}`}>
        <Icon aria-hidden className="h-5 w-5" />
      </span>
      <p className="mt-4 text-3xl font-semibold tabular-nums text-[#082F8B]">{value}</p>
      <p className="text-sm font-semibold text-[#082F8B]">{label}</p>
      <p className="mt-1 text-xs text-slate-500">{helper}</p>
    </Link>
  );
}

function Panel({
  title,
  icon: Icon,
  actionHref,
  actionLabel,
  children
}: {
  title: string;
  icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  actionHref?: string;
  actionLabel?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[22px] border border-white bg-white/95 p-5 shadow-xl shadow-blue-950/5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-blue-50 text-[#0F5EF7]">
            <Icon aria-hidden className="h-5 w-5" />
          </span>
          <h2 className="font-display truncate text-lg font-semibold text-[#082F8B]">{title}</h2>
        </div>
        {actionHref && actionLabel && (
          <Link
            href={actionHref}
            className="shrink-0 rounded-full px-3 py-1.5 text-sm font-semibold text-[#0F5EF7] transition hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F5EF7] focus-visible:ring-offset-2"
          >
            {actionLabel}
          </Link>
        )}
      </div>
      {children}
    </section>
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
    <div className="flex items-center gap-3 rounded-[16px] bg-[#F3F4F6] px-3 py-3">
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

function AttentionLink({
  title,
  description,
  href,
  tone,
  icon: Icon
}: {
  title: string;
  description: string;
  href: string;
  tone: Tone;
  icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
}) {
  return (
    <Link
      href={href}
      className="flex gap-3 rounded-[16px] border border-blue-50 px-4 py-3 transition hover:border-blue-100 hover:bg-blue-50/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F5EF7] focus-visible:ring-offset-2"
    >
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] ${toneClasses[tone]}`}>
        <Icon aria-hidden className="h-5 w-5" />
      </span>
      <span className="min-w-0">
        <span className="block break-words text-sm font-semibold text-[#082F8B]">{title}</span>
        <span className="mt-0.5 block break-words text-sm leading-5 text-slate-500">{description}</span>
      </span>
    </Link>
  );
}

function AppointmentRow({
  appointment
}: {
  appointment: {
    id: string;
    clientName: string;
    startsAt: Date;
    status: string;
    service: { name: string };
    professional: { name: string };
  };
}) {
  return (
    <div className="grid gap-2 py-3 md:grid-cols-[1fr_auto] md:items-center">
      <div className="min-w-0">
        <p className="truncate font-semibold text-[#082F8B]">{appointment.clientName} - {appointment.service.name}</p>
        <p className="truncate text-sm text-slate-500">
          {appointment.professional.name} em {formatDateTime(appointment.startsAt)}
        </p>
      </div>
      <span className={`w-fit rounded-full px-3 py-1 text-xs font-semibold ${statusClasses[appointment.status] ?? "bg-slate-100 text-slate-600"}`}>
        {statusLabel(appointment.status)}
      </span>
    </div>
  );
}

function WeeklyRow({ row, max }: { row: { key: string; label: string; total: number; active: number }; max: number }) {
  const width = row.total > 0 ? Math.max(8, Math.round((row.total / max) * 100)) : 0;
  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-3 text-sm">
        <span className="font-semibold text-[#082F8B]">{row.label}</span>
        <span className="font-semibold tabular-nums text-slate-500">
          {row.total} total / {row.active} ativo(s)
        </span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-[#F3F4F6]">
        <div className="h-full rounded-full bg-[linear-gradient(90deg,#0F5EF7,#38BDF8)]" style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

function QuickLink({
  href,
  icon: Icon,
  label
}: {
  href: string;
  icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-[16px] border border-blue-50 px-4 py-3 text-sm font-semibold text-[#082F8B] transition hover:border-blue-100 hover:bg-blue-50/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F5EF7] focus-visible:ring-offset-2"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] bg-blue-50 text-[#0F5EF7]">
        <Icon aria-hidden className="h-4 w-4" />
      </span>
      <span className="min-w-0 truncate">{label}</span>
    </Link>
  );
}

function MiniStat({ label, value, href }: { label: string; value: number; href: string }) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between gap-3 rounded-[18px] border border-white bg-white/95 px-5 py-4 shadow-lg shadow-blue-950/5 transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-blue-950/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F5EF7] focus-visible:ring-offset-2"
    >
      <span className="text-sm font-semibold text-slate-500">{label}</span>
      <span className="text-2xl font-semibold tabular-nums text-[#082F8B]">{value}</span>
    </Link>
  );
}

function EmptyState({ children }: { children: ReactNode }) {
  return <p className="rounded-[16px] bg-[#F3F4F6] px-4 py-3 text-sm font-medium text-slate-500">{children}</p>;
}

function buildWeekRows(start: Date, appointments: Array<{ startsAt: Date; status: string }>) {
  return Array.from({ length: 7 }, (_, index) => {
    const day = addDays(start, index);
    const key = toBusinessDateKey(day);
    const dayAppointments = appointments.filter((appointment) => toBusinessDateKey(appointment.startsAt) === key);
    return {
      key,
      label: formatDayLabel(day),
      total: dayAppointments.length,
      active: dayAppointments.filter((appointment) => appointment.status === "CONFIRMED" || appointment.status === "COMPLETED").length
    };
  });
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

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
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

function formatDayLabel(value: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: TIME_ZONE,
    weekday: "short",
    day: "2-digit",
    month: "2-digit"
  }).format(value);
}
