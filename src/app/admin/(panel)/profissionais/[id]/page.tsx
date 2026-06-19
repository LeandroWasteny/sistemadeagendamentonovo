import Link from "next/link";
import { notFound } from "next/navigation";
import {
  BadgePercent,
  CalendarClock,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Phone,
  Scissors,
  UserRound
} from "lucide-react";
import type { ComponentType, ReactNode } from "react";
import { requireAdmin } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { getAppointmentFinalPriceCents } from "@/lib/services/pricing";
import { formatCurrency, statusLabel } from "@/lib/utils";

export const dynamic = "force-dynamic";

type AppointmentStatus = "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED";
type SearchParams = Promise<Record<string, string | string[] | undefined>>;
type PageParams = Promise<{ id: string }>;
type DayStatusCounts = Record<AppointmentStatus, number> & { total: number };

const TIME_ZONE = "America/Fortaleza";
const BUSINESS_UTC_OFFSET_MS = 3 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const appointmentStatuses: AppointmentStatus[] = ["PENDING", "CONFIRMED", "CANCELLED", "COMPLETED"];
const statusDotClasses: Record<AppointmentStatus, string> = {
  PENDING: "bg-amber-500",
  CONFIRMED: "bg-[#0F5EF7]",
  CANCELLED: "bg-rose-500",
  COMPLETED: "bg-[#22C55E]"
};
const statusClasses: Record<AppointmentStatus, string> = {
  PENDING: "bg-amber-50 text-amber-700",
  CONFIRMED: "bg-blue-50 text-[#0F5EF7]",
  CANCELLED: "bg-rose-50 text-rose-700",
  COMPLETED: "bg-emerald-50 text-[#22C55E]"
};

export default async function ProfessionalAgendaPage({
  params,
  searchParams
}: {
  params: PageParams;
  searchParams?: SearchParams;
}) {
  await requireAdmin();

  const { id } = await params;
  const query = (await searchParams) ?? {};
  const monthKey = parseMonthKey(getFirstValue(query.month)) ?? toBusinessMonthKey(new Date());
  const selectedDateKey = parseDateKey(getFirstValue(query.date));
  const monthRange = getBusinessMonthRange(monthKey);

  const [professional, monthAppointments] = await Promise.all([
    prisma.professional.findUnique({
      where: { id },
      include: {
        services: { include: { service: true }, orderBy: { service: { name: "asc" } } },
        schedules: { where: { active: true }, orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }] }
      }
    }),
    prisma.appointment.findMany({
      where: {
        professionalId: id,
        startsAt: { gte: monthRange.start, lte: monthRange.end }
      },
      include: { service: true },
      orderBy: [{ startsAt: "asc" }, { createdAt: "desc" }]
    })
  ]);

  if (!professional) notFound();

  const visibleAppointments = selectedDateKey
    ? monthAppointments.filter((appointment) => toBusinessDateKey(appointment.startsAt) === selectedDateKey)
    : monthAppointments;
  const validAppointments = monthAppointments.filter((appointment) => appointment.status !== "CANCELLED");
  const completedAppointments = monthAppointments.filter((appointment) => appointment.status === "COMPLETED");
  const revenue = sumBy(validAppointments, getAppointmentFinalPriceCents);
  const commission = Math.round((revenue * professional.commissionPercent) / 100);
  const calendarCounts = buildCalendarCounts(monthAppointments);
  const uniqueScheduleDays = new Set(professional.schedules.map((schedule) => schedule.dayOfWeek)).size;

  return (
    <section className="space-y-6">
      <div className="overflow-hidden rounded-[24px] border border-white bg-white/95 shadow-xl shadow-blue-950/5">
        <div className="grid gap-5 p-5 md:p-6 xl:grid-cols-[1fr_auto] xl:items-center">
          <div className="flex min-w-0 items-center gap-4">
            <span className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-[22px] bg-blue-50 text-[#0F5EF7]">
              {professional.photoUrl ? (
                <img src={professional.photoUrl} alt={professional.name} className="h-full w-full object-cover" />
              ) : (
                <UserRound aria-hidden className="h-8 w-8" />
              )}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[#0F5EF7]">Agenda individual</p>
              <h1 className="font-display mt-1 break-words text-2xl font-semibold text-[#082F8B] md:text-3xl">
                {professional.name}
              </h1>
              <p className="mt-1 flex items-center gap-1.5 text-sm font-medium text-slate-500">
                <Phone aria-hidden className="h-4 w-4" />
                {professional.phone}
              </p>
            </div>
          </div>
          <Link
            href="/admin/profissionais"
            className="inline-flex h-11 min-h-11 touch-manipulation items-center justify-center rounded-[12px] border border-blue-100 bg-white px-4 text-sm font-semibold text-[#082F8B] transition hover:border-blue-200 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F5EF7] focus-visible:ring-offset-2"
          >
            Voltar para profissionais
          </Link>
        </div>
        <div className="border-t border-blue-50 bg-blue-50/35 p-4">
          <p className="max-w-3xl break-words text-sm leading-6 text-slate-600">{professional.specialties}</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard icon={CalendarClock} label="Agendamentos" value={monthAppointments.length} helper={formatMonthLabel(monthKey)} />
        <MetricCard icon={Clock3} label="Concluidos" value={completedAppointments.length} helper="status concluido" />
        <MetricCard icon={Scissors} label="Servicos" value={professional.services.length} helper="vinculados" />
        <MetricCard icon={CalendarDays} label="Dias ativos" value={uniqueScheduleDays} helper="com horario" />
        <MetricCard icon={BadgePercent} label="Comissao" value={formatCurrency(commission)} helper={`${professional.commissionPercent}% do periodo`} />
      </div>

      <div className="grid gap-6 2xl:grid-cols-[minmax(0,1fr)_360px]">
        <CalendarPanel
          professionalId={professional.id}
          monthKey={monthKey}
          selectedDateKey={selectedDateKey}
          countsByDate={calendarCounts}
        />

        <div className="space-y-6">
          <Panel title="Servicos atendidos" icon={Scissors}>
            <div className="flex flex-wrap gap-2">
              {professional.services.map((item) => (
                <span key={item.serviceId} className="rounded-full bg-blue-50 px-3 py-1 text-sm font-semibold text-[#0F5EF7]">
                  {item.service.name}
                </span>
              ))}
              {professional.services.length === 0 && <EmptyState>Nenhum servico vinculado.</EmptyState>}
            </div>
          </Panel>

          <Panel title="Horarios ativos" icon={Clock3}>
            <div className="space-y-2">
              {professional.schedules.map((schedule) => (
                <div key={schedule.id} className="rounded-[14px] bg-[#F3F4F6] px-3 py-2 text-sm font-semibold text-[#082F8B]">
                  {weekdayLabel(schedule.dayOfWeek)} - {schedule.startTime} as {schedule.endTime}
                </div>
              ))}
              {professional.schedules.length === 0 && <EmptyState>Nenhum horario ativo.</EmptyState>}
            </div>
          </Panel>
        </div>
      </div>

      <Panel id="agendamentos" title={selectedDateKey ? `Agendamentos de ${formatDateKeyLong(selectedDateKey)}` : "Agendamentos do mes"} icon={CalendarDays}>
        <div className="divide-y divide-blue-50">
          {visibleAppointments.map((appointment) => (
            <div key={appointment.id} className="grid gap-3 py-3 lg:grid-cols-[96px_minmax(0,1fr)_auto] lg:items-center">
              <div className="rounded-[16px] bg-blue-50 px-3 py-3 text-[#082F8B]">
                <p className="text-xs font-semibold uppercase text-[#0F5EF7]">{formatDateShort(appointment.startsAt)}</p>
                <p className="mt-1 text-2xl font-semibold leading-none tabular-nums">{formatTime(appointment.startsAt)}</p>
              </div>
              <div className="min-w-0">
                <p className="break-words text-base font-semibold text-[#082F8B]">{appointment.clientName}</p>
                <p className="mt-1 break-words text-sm text-slate-500">{appointment.service.name}</p>
                <p className="mt-1 text-sm font-semibold text-slate-600">{formatCurrency(getAppointmentFinalPriceCents(appointment))}</p>
              </div>
              <span className={`w-fit rounded-full px-3 py-1 text-xs font-semibold ${statusClasses[appointment.status]}`}>
                {statusLabel(appointment.status)}
              </span>
            </div>
          ))}
          {visibleAppointments.length === 0 && <EmptyState>Nenhum agendamento encontrado nesse periodo.</EmptyState>}
        </div>
      </Panel>
    </section>
  );
}

function CalendarPanel({
  professionalId,
  monthKey,
  selectedDateKey,
  countsByDate
}: {
  professionalId: string;
  monthKey: string;
  selectedDateKey: string | null;
  countsByDate: Map<string, DayStatusCounts>;
}) {
  const days = getCalendarDays(monthKey);

  return (
    <div className="overflow-hidden rounded-[22px] border border-white bg-white/95 shadow-xl shadow-blue-950/5">
      <div className="grid gap-4 border-b border-blue-50 p-5 lg:grid-cols-[1fr_auto] lg:items-center">
        <div>
          <p className="text-sm font-semibold text-[#0F5EF7]">Calendario individual</p>
          <h2 className="font-display mt-1 text-xl font-semibold text-[#082F8B]">{formatMonthLabel(monthKey)}</h2>
          <p className="mt-1 text-sm text-slate-500">Clique no dia para ver os agendamentos dessa profissional.</p>
        </div>
        <div className="flex items-center gap-2">
          <CalendarNavLink href={buildMonthHref(professionalId, addMonths(monthKey, -1))} label="Mes anterior">
            <ChevronLeft aria-hidden className="h-4 w-4" />
          </CalendarNavLink>
          <CalendarNavLink href={buildMonthHref(professionalId, addMonths(monthKey, 1))} label="Proximo mes">
            <ChevronRight aria-hidden className="h-4 w-4" />
          </CalendarNavLink>
        </div>
      </div>

      <div className="min-w-0 overflow-x-auto p-4">
        <div className="min-w-[620px]">
          <div className="grid grid-cols-7 gap-2 px-1 pb-2">
            {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"].map((day) => (
              <span key={day} className="text-center text-xs font-semibold uppercase text-slate-400">
                {day}
              </span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-2">
            {days.map((day) => (
              <CalendarDay
                key={day.dateKey}
                day={day}
                counts={countsByDate.get(day.dateKey)}
                selected={selectedDateKey === day.dateKey}
                href={buildDayHref(professionalId, day.dateKey, monthKey)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function CalendarDay({
  day,
  counts,
  selected,
  href
}: {
  day: { dateKey: string; dayNumber: number; currentMonth: boolean; today: boolean };
  counts: DayStatusCounts | undefined;
  selected: boolean;
  href: string;
}) {
  const activeStatuses = appointmentStatuses.filter((status) => (counts?.[status] ?? 0) > 0);

  return (
    <Link
      href={href}
      aria-current={selected ? "date" : undefined}
      className={[
        "group flex min-h-[86px] touch-manipulation flex-col justify-between rounded-[16px] border p-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F5EF7] focus-visible:ring-offset-2",
        selected
          ? "border-[#0F5EF7] bg-[#0F5EF7] text-white shadow-lg shadow-blue-500/20"
          : day.today
            ? "border-[#0F5EF7]/30 bg-blue-50 text-[#082F8B]"
            : day.currentMonth
              ? "border-blue-100 bg-white text-[#082F8B] hover:border-blue-200 hover:bg-blue-50"
              : "border-slate-100 bg-slate-50 text-slate-400 hover:bg-slate-100"
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm font-semibold tabular-nums">{day.dayNumber}</span>
        {counts?.total ? (
          <span className={selected ? "rounded-full bg-white/20 px-2 py-0.5 text-xs font-semibold text-white" : "rounded-full bg-[#F3F4F6] px-2 py-0.5 text-xs font-semibold text-[#082F8B]"}>
            {counts.total}
          </span>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {activeStatuses.map((status) => (
          <span key={status} className={`h-2.5 w-2.5 rounded-full ${selected ? "bg-white" : statusDotClasses[status]}`} />
        ))}
      </div>
    </Link>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  helper
}: {
  icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  label: string;
  value: number | string;
  helper: string;
}) {
  return (
    <div className="flex min-w-0 items-center gap-4 rounded-[20px] border border-white bg-white/95 p-4 shadow-lg shadow-blue-950/5">
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[15px] bg-blue-50 text-[#0F5EF7]">
        <Icon aria-hidden className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="truncate text-2xl font-semibold leading-none tabular-nums text-[#082F8B]">{value}</p>
        <p className="mt-1 truncate text-sm font-semibold text-[#082F8B]">{label}</p>
        <p className="mt-0.5 truncate text-xs text-slate-500">{helper}</p>
      </div>
    </div>
  );
}

function Panel({ id, title, icon: Icon, children }: { id?: string; title: string; icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-6 min-w-0 overflow-hidden rounded-[22px] border border-white bg-white/95 p-4 shadow-xl shadow-blue-950/5 sm:p-5">
      <div className="mb-4 flex min-w-0 items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-blue-50 text-[#0F5EF7]">
          <Icon aria-hidden className="h-5 w-5" />
        </span>
        <h2 className="font-display min-w-0 text-pretty text-lg font-semibold text-[#082F8B]">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function CalendarNavLink({ href, label, children }: { href: string; label: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      aria-label={label}
      className="inline-flex h-11 w-11 min-h-11 touch-manipulation items-center justify-center rounded-[12px] border border-blue-100 bg-white text-[#082F8B] transition hover:border-blue-200 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F5EF7] focus-visible:ring-offset-2"
    >
      {children}
    </Link>
  );
}

function EmptyState({ children }: { children: ReactNode }) {
  return <p className="rounded-[16px] bg-[#F3F4F6] px-4 py-3 text-sm font-medium text-slate-500">{children}</p>;
}

function buildCalendarCounts(rows: Array<{ startsAt: Date; status: AppointmentStatus }>) {
  const counts = new Map<string, DayStatusCounts>();

  for (const row of rows) {
    const key = toBusinessDateKey(row.startsAt);
    const current =
      counts.get(key) ??
      ({
        total: 0,
        PENDING: 0,
        CONFIRMED: 0,
        CANCELLED: 0,
        COMPLETED: 0
      } satisfies DayStatusCounts);
    current.total += 1;
    current[row.status] += 1;
    counts.set(key, current);
  }

  return counts;
}

function sumBy<T>(items: T[], getValue: (item: T) => number) {
  return items.reduce((sum, item) => sum + getValue(item), 0);
}

function getFirstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function parseDateKey(value: string | undefined) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = createBusinessDate(value);
  return toBusinessDateKey(date) === value ? value : null;
}

function parseMonthKey(value: string | undefined) {
  if (!value || !/^\d{4}-\d{2}$/.test(value)) return null;
  const date = createBusinessDate(`${value}-01`);
  return toBusinessMonthKey(date) === value ? value : null;
}

function getBusinessMonthRange(monthKey: string) {
  const start = new Date(`${monthKey}-01T00:00:00-03:00`);
  const nextMonth = addMonths(monthKey, 1);
  const end = new Date(new Date(`${nextMonth}-01T00:00:00-03:00`).getTime() - 1);
  return { start, end };
}

function getCalendarDays(monthKey: string) {
  const firstDay = createBusinessDate(`${monthKey}-01`);
  const firstWeekday = firstDay.getUTCDay();
  const gridStart = new Date(firstDay.getTime() - firstWeekday * DAY_MS);
  const currentMonth = monthKey;
  const todayKey = toBusinessDateKey(new Date());

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart.getTime() + index * DAY_MS);
    const dateKey = toBusinessDateKey(date);
    return {
      dateKey,
      dayNumber: Number(dateKey.slice(-2)),
      currentMonth: dateKey.startsWith(currentMonth),
      today: dateKey === todayKey
    };
  });
}

function buildMonthHref(professionalId: string, monthKey: string) {
  return `/admin/profissionais/${professionalId}?month=${monthKey}`;
}

function buildDayHref(professionalId: string, dateKey: string, monthKey: string) {
  return `/admin/profissionais/${professionalId}?month=${monthKey}&date=${dateKey}#agendamentos`;
}

function addMonths(monthKey: string, amount: number) {
  const date = createBusinessDate(`${monthKey}-01`);
  date.setUTCMonth(date.getUTCMonth() + amount);
  return toBusinessMonthKey(date);
}

function createBusinessDate(dateKey: string) {
  return new Date(`${dateKey}T12:00:00-03:00`);
}

function toBusinessDateKey(date: Date) {
  return new Date(date.getTime() - BUSINESS_UTC_OFFSET_MS).toISOString().slice(0, 10);
}

function toBusinessMonthKey(date: Date) {
  return toBusinessDateKey(date).slice(0, 7);
}

function formatDateShort(value: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: TIME_ZONE,
    day: "2-digit",
    month: "2-digit"
  }).format(value);
}

function formatDateKeyLong(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: TIME_ZONE,
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(createBusinessDate(value));
}

function formatMonthLabel(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: TIME_ZONE,
    month: "long",
    year: "numeric"
  }).format(createBusinessDate(`${value}-01`));
}

function formatTime(value: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit"
  }).format(value);
}

function weekdayLabel(dayOfWeek: number) {
  return ["Domingo", "Segunda", "Terca", "Quarta", "Quinta", "Sexta", "Sabado"][dayOfWeek] ?? "Dia";
}
