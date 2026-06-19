import { Activity, BadgeCheck, BadgePercent, CalendarClock, CircleX, Clock3, ListChecks, Scissors, TicketPercent, TrendingUp, Users } from "lucide-react";
import type { ComponentType, ReactNode } from "react";
import { prisma } from "@/lib/prisma";
import { getAppointmentDiscountCents } from "@/lib/services/pricing";
import { formatCurrency, statusLabel } from "@/lib/utils";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const statusTones: Record<string, string> = {
  PENDING: "bg-amber-50 text-amber-700",
  CONFIRMED: "bg-blue-50 text-[#0F5EF7]",
  CANCELLED: "bg-rose-50 text-rose-700",
  COMPLETED: "bg-emerald-50 text-[#22C55E]"
};

export default async function ReportsPage({ searchParams }: { searchParams?: SearchParams }) {
  const params = (await searchParams) ?? {};
  const defaultRange = getCurrentMonthRange();
  const from = getFirstValue(params.from) || defaultRange.from;
  const to = getFirstValue(params.to) || defaultRange.to;
  const fromDate = startOfDay(from);
  const toDate = endOfDay(to);

  const appointments = await prisma.appointment.findMany({
    where: {
      startsAt: {
        gte: fromDate,
        lte: toDate
      }
    },
    include: {
      service: true,
      professional: true,
      coupon: true
    },
    orderBy: { startsAt: "asc" }
  });

  const total = appointments.length;
  const pending = appointments.filter((appointment) => appointment.status === "PENDING").length;
  const confirmed = appointments.filter((appointment) => appointment.status === "CONFIRMED").length;
  const completed = appointments.filter((appointment) => appointment.status === "COMPLETED").length;
  const cancelled = appointments.filter((appointment) => appointment.status === "CANCELLED").length;
  const activeAppointments = confirmed + completed;
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
  const cancellationRate = total > 0 ? Math.round((cancelled / total) * 100) : 0;
  const discountedAppointments = appointments.filter((appointment) => getAppointmentDiscountCents(appointment) > 0);
  const couponAppointments = appointments.filter((appointment) => appointment.couponId !== null);
  const totalDiscounts = discountedAppointments.reduce((sum, appointment) => sum + getAppointmentDiscountCents(appointment), 0);

  const statusRows = [
    { status: "PENDING", value: pending },
    { status: "CONFIRMED", value: confirmed },
    { status: "COMPLETED", value: completed },
    { status: "CANCELLED", value: cancelled }
  ];

  const serviceRows = rankBy(appointments, (appointment) => appointment.service.name);
  const professionalRows = rankBy(appointments, (appointment) => appointment.professional.name);
  const promotionRows = rankMoney(discountedAppointments, (appointment) => appointment.service.name);
  const couponRows = rankMoney(couponAppointments, (appointment) => appointment.coupon?.code ?? "Cupom removido");
  const dailyRows = rankBy(appointments, (appointment) => toDateKey(appointment.startsAt), "date").sort((a, b) => a.key.localeCompare(b.key));
  const nextAppointments = appointments
    .filter((appointment) => appointment.status !== "CANCELLED" && appointment.startsAt >= new Date())
    .slice(0, 5);

  return (
    <section className="space-y-6">
      <div className="rounded-[24px] border border-white bg-white/95 p-5 shadow-xl shadow-blue-950/5 md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-[#0F5EF7]">Inteligencia operacional</p>
            <h1 className="font-display mt-1 text-2xl font-semibold text-[#082F8B]">Relatorios</h1>
            <p className="mt-1 text-sm text-slate-500">Acompanhe volume, status, servicos e profissionais no periodo.</p>
          </div>
          <form className="grid w-full gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end lg:w-auto" method="get">
            <label className="space-y-1.5 text-sm font-semibold text-[#082F8B]">
              De
              <input
                className="h-11 min-h-11 w-full touch-manipulation rounded-[12px] border border-blue-100 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-[#0F5EF7] focus:ring-2 focus:ring-blue-100"
                defaultValue={from}
                name="from"
                type="date"
              />
            </label>
            <label className="space-y-1.5 text-sm font-semibold text-[#082F8B]">
              Ate
              <input
                className="h-11 min-h-11 w-full touch-manipulation rounded-[12px] border border-blue-100 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-[#0F5EF7] focus:ring-2 focus:ring-blue-100"
                defaultValue={to}
                name="to"
                type="date"
              />
            </label>
            <button className="h-11 min-h-11 touch-manipulation rounded-[12px] bg-[#0F5EF7] px-4 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:bg-[#082F8B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F5EF7] focus-visible:ring-offset-2">
              Filtrar
            </button>
          </form>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard icon={CalendarClock} label="Agendamentos" value={total} helper="Total no periodo" tone="blue" />
        <MetricCard icon={BadgeCheck} label="Ativos" value={activeAppointments} helper="Confirmados + concluidos" tone="green" />
        <MetricCard icon={Clock3} label="Pendentes" value={pending} helper="Aguardando confirmacao" tone="amber" />
        <MetricCard icon={CircleX} label="Cancelados" value={`${cancellationRate}%`} helper={`${cancelled} cancelamento(s)`} tone="rose" />
        <MetricCard icon={TrendingUp} label="Conclusao" value={`${completionRate}%`} helper={`${completed} concluido(s)`} tone="sky" />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard icon={BadgePercent} label="Com desconto" value={discountedAppointments.length} helper="promocao ou cupom" tone="green" />
        <MetricCard icon={TicketPercent} label="Cupons usados" value={couponAppointments.length} helper="no periodo" tone="amber" />
        <MetricCard icon={BadgePercent} label="Descontos" value={formatCurrency(totalDiscounts)} helper="concedidos" tone="rose" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <ReportPanel title="Agendamentos por dia" icon={Activity}>
          {dailyRows.length > 0 ? (
            <div className="space-y-3">
              {dailyRows.map((row) => (
                <ProgressRow key={row.key} label={formatDateLabel(row.key)} value={row.value} max={total} />
              ))}
            </div>
          ) : (
            <EmptyState>Nenhum agendamento no periodo.</EmptyState>
          )}
        </ReportPanel>

        <ReportPanel title="Status dos agendamentos" icon={ListChecks}>
          <div className="grid gap-3 sm:grid-cols-2">
            {statusRows.map((row) => (
              <div key={row.status} className={`rounded-[16px] px-4 py-3 ${statusTones[row.status]}`}>
                <p className="text-2xl font-semibold">{row.value}</p>
                <p className="text-sm font-semibold capitalize">{statusLabel(row.status)}</p>
              </div>
            ))}
          </div>
        </ReportPanel>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <ReportPanel title="Servicos mais agendados" icon={Scissors}>
          {serviceRows.length > 0 ? (
            <div className="space-y-3">
              {serviceRows.map((row) => (
                <ProgressRow key={row.key} label={row.key} value={row.value} max={total} />
              ))}
            </div>
          ) : (
            <EmptyState>Sem servicos agendados neste periodo.</EmptyState>
          )}
        </ReportPanel>

        <ReportPanel title="Profissionais com mais atendimentos" icon={Users}>
          {professionalRows.length > 0 ? (
            <div className="space-y-3">
              {professionalRows.map((row) => (
                <ProgressRow key={row.key} label={row.key} value={row.value} max={total} />
              ))}
            </div>
          ) : (
            <EmptyState>Sem profissionais com agendamentos neste periodo.</EmptyState>
          )}
        </ReportPanel>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <ReportPanel title="Promocoes por servico" icon={BadgePercent}>
          {promotionRows.length > 0 ? (
            <div className="space-y-3">
              {promotionRows.map((row) => (
                <MoneyProgressRow key={row.key} label={row.key} value={row.value} count={row.count} max={totalDiscounts} />
              ))}
            </div>
          ) : (
            <EmptyState>Nenhum desconto aplicado no periodo.</EmptyState>
          )}
        </ReportPanel>

        <ReportPanel title="Cupons mais usados" icon={TicketPercent}>
          {couponRows.length > 0 ? (
            <div className="space-y-3">
              {couponRows.map((row) => (
                <MoneyProgressRow key={row.key} label={row.key} value={row.value} count={row.count} max={totalDiscounts} />
              ))}
            </div>
          ) : (
            <EmptyState>Nenhum cupom usado neste periodo.</EmptyState>
          )}
        </ReportPanel>
      </div>

      <ReportPanel title="Proximos agendamentos do periodo" icon={CalendarClock}>
        {nextAppointments.length > 0 ? (
          <div className="divide-y divide-blue-50">
            {nextAppointments.map((appointment) => (
              <div key={appointment.id} className="grid gap-2 py-3 md:grid-cols-[1fr_auto] md:items-center">
                <div>
                  <p className="font-semibold text-[#082F8B]">{appointment.clientName} - {appointment.service.name}</p>
                  <p className="text-sm text-slate-500">
                    {appointment.professional.name} em {formatDateTime(appointment.startsAt)}
                  </p>
                </div>
                <span className={`w-fit rounded-full px-3 py-1 text-xs font-semibold ${statusTones[appointment.status]}`}>
                  {statusLabel(appointment.status)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState>Nenhum proximo agendamento encontrado para esse filtro.</EmptyState>
        )}
      </ReportPanel>
    </section>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  helper,
  tone
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: number | string;
  helper: string;
  tone: "blue" | "green" | "amber" | "rose" | "sky";
}) {
  const toneClass = {
    blue: "bg-blue-50 text-[#0F5EF7]",
    green: "bg-emerald-50 text-[#22C55E]",
    amber: "bg-amber-50 text-amber-700",
    rose: "bg-rose-50 text-rose-700",
    sky: "bg-sky-50 text-[#38BDF8]"
  }[tone];

  return (
    <div className="flex min-w-0 items-center gap-4 rounded-[20px] border border-white bg-white/95 p-4 shadow-lg shadow-blue-950/5">
      <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-[15px] ${toneClass}`}>
        <Icon aria-hidden className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="text-3xl font-semibold leading-none tabular-nums text-[#082F8B]">{value}</p>
        <p className="mt-1 truncate text-sm font-semibold text-[#082F8B]">{label}</p>
        <p className="mt-0.5 truncate text-xs text-slate-500">{helper}</p>
      </div>
    </div>
  );
}

function ReportPanel({
  title,
  icon: Icon,
  children
}: {
  title: string;
  icon: ComponentType<{ className?: string }>;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0 overflow-hidden rounded-[22px] border border-white bg-white/95 p-4 shadow-xl shadow-blue-950/5 sm:p-5">
      <div className="mb-4 flex min-w-0 items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-blue-50 text-[#0F5EF7]">
          <Icon aria-hidden className="h-5 w-5" />
        </span>
        <h2 className="font-display min-w-0 text-pretty text-lg font-semibold text-[#082F8B]">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function ProgressRow({ label, value, max }: { label: string; value: number; max: number }) {
  const width = max > 0 ? Math.max(8, Math.round((value / max) * 100)) : 0;
  return (
    <div>
      <div className="mb-1 flex min-w-0 items-center justify-between gap-3 text-sm">
        <span className="min-w-0 truncate font-semibold text-[#082F8B]">{label}</span>
        <span className="shrink-0 font-semibold tabular-nums text-slate-500">{value}</span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-[#F3F4F6]">
        <div className="h-full rounded-full bg-[linear-gradient(90deg,#0F5EF7,#38BDF8)]" style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

function MoneyProgressRow({ label, value, count, max }: { label: string; value: number; count: number; max: number }) {
  const width = max > 0 ? Math.max(8, Math.round((value / max) * 100)) : 0;
  return (
    <div>
      <div className="mb-1 flex min-w-0 items-center justify-between gap-3 text-sm">
        <span className="min-w-0 truncate font-semibold text-[#082F8B]">{label}</span>
        <span className="shrink-0 font-semibold tabular-nums text-slate-500">{formatCurrency(value)}</span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-[#F3F4F6]">
        <div className="h-full rounded-full bg-[linear-gradient(90deg,#22C55E,#38BDF8)]" style={{ width: `${width}%` }} />
      </div>
      <p className="mt-1 text-xs font-medium text-slate-400">{count} agendamento(s)</p>
    </div>
  );
}

function EmptyState({ children }: { children: ReactNode }) {
  return <p className="rounded-[16px] bg-[#F3F4F6] px-4 py-3 text-sm font-medium text-slate-500">{children}</p>;
}

function rankBy<T>(items: T[], getKey: (item: T) => string, mode: "rank" | "date" = "rank") {
  const map = new Map<string, number>();
  items.forEach((item) => {
    const key = getKey(item);
    map.set(key, (map.get(key) ?? 0) + 1);
  });

  const rows = Array.from(map.entries()).map(([key, value]) => ({ key, value }));
  return mode === "date" ? rows : rows.sort((a, b) => b.value - a.value).slice(0, 8);
}

function rankMoney<T>(items: T[], getKey: (item: T) => string) {
  const map = new Map<string, { value: number; count: number }>();
  items.forEach((item) => {
    const key = getKey(item);
    const current = map.get(key) ?? { value: 0, count: 0 };
    current.value += getAppointmentDiscountCents(item as T & Parameters<typeof getAppointmentDiscountCents>[0]);
    current.count += 1;
    map.set(key, current);
  });

  return Array.from(map.entries())
    .map(([key, row]) => ({ key, ...row }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);
}

function getFirstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function getCurrentMonthRange() {
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return {
    from: toInputDate(firstDay),
    to: toInputDate(lastDay)
  };
}

function startOfDay(value: string) {
  return new Date(`${value}T00:00:00`);
}

function endOfDay(value: string) {
  return new Date(`${value}T23:59:59.999`);
}

function toInputDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function toDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function formatDateLabel(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit" }).format(new Date(`${value}T12:00:00`));
}

function formatDateTime(value: Date) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(value);
}
