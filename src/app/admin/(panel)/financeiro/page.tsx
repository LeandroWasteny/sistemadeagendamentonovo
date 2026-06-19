import { BadgePercent, Banknote, CalendarDays, CircleDollarSign, ReceiptText, TrendingUp } from "lucide-react";
import type { ComponentType, ReactNode } from "react";
import { prisma } from "@/lib/prisma";
import { getAppointmentDiscountCents, getAppointmentFinalPriceCents } from "@/lib/services/pricing";
import { formatCurrency, statusLabel } from "@/lib/utils";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
type Tone = "blue" | "green" | "amber" | "rose" | "sky";

const statusClasses: Record<string, string> = {
  PENDING: "bg-amber-50 text-amber-700",
  CONFIRMED: "bg-blue-50 text-[#0F5EF7]",
  CANCELLED: "bg-rose-50 text-rose-700",
  COMPLETED: "bg-emerald-50 text-[#22C55E]"
};

const toneClasses: Record<Tone, string> = {
  blue: "bg-blue-50 text-[#0F5EF7]",
  green: "bg-emerald-50 text-[#22C55E]",
  amber: "bg-amber-50 text-amber-700",
  rose: "bg-rose-50 text-rose-700",
  sky: "bg-sky-50 text-[#38BDF8]"
};

export default async function FinancePage({ searchParams }: { searchParams?: SearchParams }) {
  const params = (await searchParams) ?? {};
  const defaultRange = getCurrentMonthRange();
  const from = getFirstValue(params.from) || defaultRange.from;
  const to = getFirstValue(params.to) || defaultRange.to;
  const fromDate = startOfDay(from);
  const toDate = endOfDay(to);

  const appointments = await prisma.appointment.findMany({
    where: { startsAt: { gte: fromDate, lte: toDate } },
    include: { service: true, professional: true, coupon: true },
    orderBy: { startsAt: "desc" }
  });

  const validAppointments = appointments.filter((appointment) => appointment.status !== "CANCELLED");
  const completedAppointments = appointments.filter((appointment) => appointment.status === "COMPLETED");
  const pendingAppointments = appointments.filter((appointment) => appointment.status === "PENDING" || appointment.status === "CONFIRMED");
  const cancelledAppointments = appointments.filter((appointment) => appointment.status === "CANCELLED");
  const grossRevenue = sumBy(validAppointments, (appointment) => appointment.priceCents ?? appointment.service.priceCents);
  const projectedRevenue = sumBy(validAppointments, getAppointmentFinalPriceCents);
  const completedRevenue = sumBy(completedAppointments, getAppointmentFinalPriceCents);
  const pendingRevenue = sumBy(pendingAppointments, getAppointmentFinalPriceCents);
  const lostRevenue = sumBy(cancelledAppointments, getAppointmentFinalPriceCents);
  const discounts = sumBy(validAppointments, getAppointmentDiscountCents);
  const averageTicket = validAppointments.length > 0 ? Math.round(projectedRevenue / validAppointments.length) : 0;
  const couponAppointments = validAppointments.filter((appointment) => appointment.couponId !== null);
  const serviceRows = rankMoney(validAppointments, (appointment) => appointment.service.name);
  const couponRows = rankMoney(couponAppointments, (appointment) => appointment.coupon?.code ?? "Cupom removido");

  return (
    <section className="space-y-6">
      <div className="rounded-[24px] border border-white bg-white/95 p-5 shadow-xl shadow-blue-950/5 md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-[#0F5EF7]">Gestao financeira</p>
            <h1 className="font-display mt-1 text-2xl font-semibold text-[#082F8B] md:text-3xl">Financeiro</h1>
            <p className="mt-1 text-sm text-slate-500">Acompanhe receita prevista, receita concluida, descontos e tickets do periodo.</p>
          </div>
          <form className="grid w-full gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end lg:w-auto" method="get">
            <DateField label="De" name="from" defaultValue={from} />
            <DateField label="Ate" name="to" defaultValue={to} />
            <button className="h-11 min-h-11 rounded-[12px] bg-[#0F5EF7] px-4 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:bg-[#082F8B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F5EF7] focus-visible:ring-offset-2">
              Filtrar
            </button>
          </form>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard icon={CircleDollarSign} label="Receita prevista" value={formatCurrency(projectedRevenue)} helper={`${validAppointments.length} agendamento(s)`} tone="blue" />
        <MetricCard icon={Banknote} label="Receita concluida" value={formatCurrency(completedRevenue)} helper={`${completedAppointments.length} concluido(s)`} tone="green" />
        <MetricCard icon={ReceiptText} label="A receber" value={formatCurrency(pendingRevenue)} helper="pendentes + confirmados" tone="amber" />
        <MetricCard icon={BadgePercent} label="Descontos" value={formatCurrency(discounts)} helper={`${couponAppointments.length} com cupom`} tone="rose" />
        <MetricCard icon={TrendingUp} label="Ticket medio" value={formatCurrency(averageTicket)} helper={`bruto ${formatCurrency(grossRevenue)}`} tone="sky" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_0.85fr]">
        <Panel title="Receita por servico" icon={TrendingUp}>
          {serviceRows.length > 0 ? (
            <div className="space-y-3">
              {serviceRows.map((row) => (
                <MoneyRow key={row.key} row={row} max={projectedRevenue} />
              ))}
            </div>
          ) : (
            <EmptyState>Nenhuma receita no periodo.</EmptyState>
          )}
        </Panel>

        <Panel title="Cupons no financeiro" icon={BadgePercent}>
          {couponRows.length > 0 ? (
            <div className="space-y-3">
              {couponRows.map((row) => (
                <MoneyRow key={row.key} row={row} max={projectedRevenue} />
              ))}
            </div>
          ) : (
            <EmptyState>Nenhum cupom usado no periodo.</EmptyState>
          )}
        </Panel>
      </div>

      <Panel title="Ultimos lancamentos" icon={CalendarDays}>
        {appointments.length > 0 ? (
          <div className="divide-y divide-blue-50">
            {appointments.slice(0, 12).map((appointment) => (
              <div key={appointment.id} className="grid gap-2 py-3 lg:grid-cols-[1fr_auto_auto] lg:items-center">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-[#082F8B]">{appointment.clientName} - {appointment.service.name}</p>
                  <p className="truncate text-sm text-slate-500">
                    {formatDateTime(appointment.startsAt)} {appointment.coupon ? `- cupom ${appointment.coupon.code}` : ""}
                  </p>
                </div>
                <span className={`w-fit rounded-full px-3 py-1 text-xs font-semibold ${statusClasses[appointment.status]}`}>
                  {statusLabel(appointment.status)}
                </span>
                <span className="text-right text-base font-bold tabular-nums text-[#082F8B]">
                  {formatCurrency(getAppointmentFinalPriceCents(appointment))}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState>Nenhum lancamento encontrado para esse filtro.</EmptyState>
        )}
      </Panel>
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
  icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  label: string;
  value: string;
  helper: string;
  tone: Tone;
}) {
  return (
    <div className="flex min-w-0 items-center gap-4 rounded-[20px] border border-white bg-white/95 p-4 shadow-lg shadow-blue-950/5">
      <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-[15px] ${toneClasses[tone]}`}>
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

function Panel({ title, icon: Icon, children }: { title: string; icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>; children: ReactNode }) {
  return (
    <section className="min-w-0 overflow-hidden rounded-[22px] border border-white bg-white/95 p-4 shadow-xl shadow-blue-950/5 sm:p-5">
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

function MoneyRow({ row, max }: { row: { key: string; value: number; count: number }; max: number }) {
  const width = max > 0 ? Math.max(8, Math.round((row.value / max) * 100)) : 0;
  return (
    <div>
      <div className="mb-1 flex min-w-0 items-center justify-between gap-3 text-sm">
        <span className="min-w-0 truncate font-semibold text-[#082F8B]">{row.key}</span>
        <span className="shrink-0 font-semibold tabular-nums text-slate-500">{formatCurrency(row.value)}</span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-[#F3F4F6]">
        <div className="h-full rounded-full bg-[linear-gradient(90deg,#0F5EF7,#38BDF8)]" style={{ width: `${width}%` }} />
      </div>
      <p className="mt-1 text-xs font-medium text-slate-400">{row.count} agendamento(s)</p>
    </div>
  );
}

function DateField({ label, name, defaultValue }: { label: string; name: string; defaultValue: string }) {
  return (
    <label className="space-y-1.5 text-sm font-semibold text-[#082F8B]">
      {label}
      <input
        className="h-11 min-h-11 w-full rounded-[12px] border border-blue-100 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-[#0F5EF7] focus:ring-2 focus:ring-blue-100"
        defaultValue={defaultValue}
        name={name}
        type="date"
      />
    </label>
  );
}

function EmptyState({ children }: { children: ReactNode }) {
  return <p className="rounded-[16px] bg-[#F3F4F6] px-4 py-3 text-sm font-medium text-slate-500">{children}</p>;
}

function rankMoney<T>(items: T[], getKey: (item: T) => string) {
  const map = new Map<string, { value: number; count: number }>();
  items.forEach((item) => {
    const key = getKey(item);
    const current = map.get(key) ?? { value: 0, count: 0 };
    current.value += getAppointmentFinalPriceCents(item as T & Parameters<typeof getAppointmentFinalPriceCents>[0]);
    current.count += 1;
    map.set(key, current);
  });

  return Array.from(map.entries())
    .map(([key, row]) => ({ key, ...row }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);
}

function sumBy<T>(items: T[], getValue: (item: T) => number) {
  return items.reduce((sum, item) => sum + getValue(item), 0);
}

function getFirstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function getCurrentMonthRange() {
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return { from: toInputDate(firstDay), to: toInputDate(lastDay) };
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

function formatDateTime(value: Date) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(value);
}
