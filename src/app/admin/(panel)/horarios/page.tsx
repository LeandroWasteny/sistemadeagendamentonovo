import Link from "next/link";
import { revalidatePath } from "next/cache";
import {
  AlertTriangle,
  BadgeCheck,
  CalendarClock,
  Clock3,
  Pencil,
  Plus,
  Search,
  Trash2,
  UserRound
} from "lucide-react";
import type { ComponentType, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { requireAdmin } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
type ScheduleStatusFilter = "all" | "active" | "inactive";
type Tone = "blue" | "green" | "amber" | "rose" | "sky";
type ScheduleFormInput = {
  professionalId: string;
  startTime: string;
  endTime: string;
  intervalMinutes: number;
  active: boolean;
};
type ScheduleBlockFormInput = {
  professionalId: string | null;
  date: Date;
  startTime: string | null;
  endTime: string | null;
  reason: string;
  active: boolean;
};

const days = [
  { value: 0, label: "Domingo", short: "Dom" },
  { value: 1, label: "Segunda", short: "Seg" },
  { value: 2, label: "Terca", short: "Ter" },
  { value: 3, label: "Quarta", short: "Qua" },
  { value: 4, label: "Quinta", short: "Qui" },
  { value: 5, label: "Sexta", short: "Sex" },
  { value: 6, label: "Sabado", short: "Sab" }
];

const statusFilters: Array<{ value: ScheduleStatusFilter; label: string }> = [
  { value: "all", label: "Todos" },
  { value: "active", label: "Ativos" },
  { value: "inactive", label: "Inativos" }
];

const toneClasses: Record<Tone, string> = {
  blue: "bg-blue-50 text-[#0F5EF7]",
  green: "bg-emerald-50 text-[#22C55E]",
  amber: "bg-amber-50 text-amber-700",
  rose: "bg-rose-50 text-rose-700",
  sky: "bg-sky-50 text-[#38BDF8]"
};

async function createSchedules(formData: FormData) {
  "use server";
  await requireAdmin();

  const input = parseScheduleForm(formData);
  const selectedDays = parseSelectedDays(formData);
  if (!input || selectedDays.length === 0) return;

  await prisma.professionalSchedule.createMany({
    data: selectedDays.map((dayOfWeek) => ({
      ...input,
      dayOfWeek
    })),
    skipDuplicates: true
  });

  revalidateSchedulePaths();
}

async function updateSchedule(formData: FormData) {
  "use server";
  await requireAdmin();

  const id = parseActionId(formData.get("id"));
  const dayOfWeek = parseDay(formData.get("dayOfWeek"));
  const input = parseScheduleForm(formData);
  if (!id || dayOfWeek === null || !input) return;

  const duplicate = await prisma.professionalSchedule.findFirst({
    where: {
      id: { not: id },
      professionalId: input.professionalId,
      dayOfWeek,
      startTime: input.startTime,
      endTime: input.endTime
    },
    select: { id: true }
  });
  if (duplicate) return;

  await prisma.professionalSchedule.update({
    where: { id },
    data: { ...input, dayOfWeek }
  });

  revalidateSchedulePaths();
}

async function toggleSchedule(formData: FormData) {
  "use server";
  await requireAdmin();

  const id = parseActionId(formData.get("id"));
  if (!id) return;

  await prisma.professionalSchedule.update({
    where: { id },
    data: { active: formData.get("active") === "true" }
  });

  revalidateSchedulePaths();
}

async function deleteSchedule(formData: FormData) {
  "use server";
  await requireAdmin();

  const id = parseActionId(formData.get("id"));
  if (!id) return;

  await prisma.professionalSchedule.delete({ where: { id } });
  revalidateSchedulePaths();
}

async function createScheduleBlock(formData: FormData) {
  "use server";
  await requireAdmin();

  const input = parseScheduleBlockForm(formData);
  if (!input) return;

  await prisma.scheduleBlock.create({ data: input });
  revalidateSchedulePaths();
}

async function toggleScheduleBlock(formData: FormData) {
  "use server";
  await requireAdmin();

  const id = parseActionId(formData.get("id"));
  if (!id) return;

  await prisma.scheduleBlock.update({
    where: { id },
    data: { active: formData.get("active") === "true" }
  });

  revalidateSchedulePaths();
}

async function deleteScheduleBlock(formData: FormData) {
  "use server";
  await requireAdmin();

  const id = parseActionId(formData.get("id"));
  if (!id) return;

  await prisma.scheduleBlock.delete({ where: { id } });
  revalidateSchedulePaths();
}

export default async function SchedulesPage({ searchParams }: { searchParams?: SearchParams }) {
  await requireAdmin();

  const params = (await searchParams) ?? {};
  const selectedProfessionalId = parseProfessionalFilter(getFirstValue(params.professionalId));
  const selectedDay = parseDayFilter(getFirstValue(params.day));
  const selectedStatus = parseStatusFilter(getFirstValue(params.status));
  const where = buildScheduleWhere(selectedProfessionalId, selectedDay, selectedStatus);

  const [professionals, schedules, scheduleBlocks, totalSchedules, activeSchedules, inactiveSchedules, withoutScheduleTotal, activeProfessionalTotal, activeScheduleBlocks] =
    await Promise.all([
      prisma.professional.findMany({
        include: {
          services: { include: { service: true }, orderBy: { service: { name: "asc" } } },
          schedules: { select: { id: true, dayOfWeek: true, active: true } }
        },
        orderBy: [{ active: "desc" }, { name: "asc" }]
      }),
      prisma.professionalSchedule.findMany({
        where,
        include: {
          professional: {
            include: { services: { include: { service: true }, orderBy: { service: { name: "asc" } } } }
          }
        },
        orderBy: [{ professional: { name: "asc" } }, { dayOfWeek: "asc" }, { startTime: "asc" }]
      }),
      prisma.scheduleBlock.findMany({
        include: { professional: { select: { id: true, name: true } } },
        orderBy: [{ active: "desc" }, { date: "asc" }, { startTime: "asc" }, { createdAt: "desc" }]
      }),
      prisma.professionalSchedule.count(),
      prisma.professionalSchedule.count({ where: { active: true } }),
      prisma.professionalSchedule.count({ where: { active: false } }),
      prisma.professional.count({ where: { active: true, schedules: { none: { active: true } } } }),
      prisma.professional.count({ where: { active: true } }),
      prisma.scheduleBlock.count({ where: { active: true } })
    ]);
  const activeProfessionals = professionals.filter((professional) => professional.active);

  return (
    <section className="space-y-6">
      <div className="overflow-hidden rounded-[24px] border border-white bg-white/95 shadow-xl shadow-blue-950/5">
        <div className="grid gap-5 p-5 md:p-6 xl:grid-cols-[1fr_auto] xl:items-center">
          <div>
            <p className="text-sm font-semibold text-[#0F5EF7]">Disponibilidade da equipe</p>
            <h1 className="font-display mt-1 text-balance text-2xl font-semibold text-[#082F8B] md:text-3xl">
              Horarios
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Monte a agenda por profissional, crie varios dias de uma vez e desative janelas sem apagar o historico.
            </p>
          </div>
          <Link
            href="/admin/agendamentos"
            className="inline-flex h-11 min-h-11 touch-manipulation items-center justify-center gap-2 rounded-[12px] bg-[#0F5EF7] px-4 text-sm font-semibold text-white shadow-sm shadow-blue-500/20 transition hover:bg-[#0B4FD9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F5EF7] focus-visible:ring-offset-2"
          >
            <CalendarClock aria-hidden className="h-4 w-4" />
            Ver agenda
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <MetricCard icon={CalendarClock} label="Janelas" value={totalSchedules} helper="horarios cadastrados" tone="blue" />
        <MetricCard icon={BadgeCheck} label="Ativas" value={activeSchedules} helper="aparecem na agenda" tone="green" />
        <MetricCard icon={Clock3} label="Inativas" value={inactiveSchedules} helper="pausadas" tone="sky" />
        <MetricCard icon={AlertTriangle} label="Sem horario" value={withoutScheduleTotal} helper="profissionais ativas" tone="amber" />
        <MetricCard icon={UserRound} label="Profissionais" value={activeProfessionalTotal} helper="ativas no sistema" tone="rose" />
        <MetricCard icon={AlertTriangle} label="Bloqueios" value={activeScheduleBlocks} helper="feriados e folgas" tone="amber" />
      </div>

      <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(320px,410px)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-4">
        <form action={createSchedules} className="min-w-0 rounded-[22px] border border-white bg-white/95 p-5 shadow-xl shadow-blue-950/5">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-blue-50 text-[#0F5EF7]">
              <Plus aria-hidden className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-semibold text-[#0F5EF7]">Nova janela</p>
              <h2 className="font-display text-xl font-semibold text-[#082F8B]">Cadastrar horarios</h2>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            <Field label="Profissional">
              <Select name="professionalId" required>
                <option value="">Selecione uma profissional</option>
                {activeProfessionals.map((professional) => (
                  <option key={professional.id} value={professional.id}>
                    {professional.name} - {professional.services.map((item) => item.service.name).join(", ") || "sem servico"}
                  </option>
                ))}
              </Select>
            </Field>

            <fieldset className="rounded-[16px] border border-blue-100 bg-blue-50/40 p-3">
              <legend className="px-1 text-sm font-semibold text-[#082F8B]">Dias da semana</legend>
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {days.map((day) => (
                  <label key={day.value} className="flex min-h-10 items-center gap-2 rounded-[12px] bg-white px-3 text-sm font-semibold text-[#082F8B] ring-1 ring-blue-100">
                    <input name="dayOfWeek" type="checkbox" value={day.value} defaultChecked={day.value >= 1 && day.value <= 5} />
                    {day.short}
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Inicio">
                <Input name="startTime" type="time" defaultValue="09:00" required />
              </Field>
              <Field label="Fim">
                <Input name="endTime" type="time" defaultValue="18:00" required />
              </Field>
            </div>
            <Field label="Intervalo entre vagas">
              <Select name="intervalMinutes" defaultValue="30" required>
                {[15, 20, 30, 45, 60, 90, 120].map((minutes) => (
                  <option key={minutes} value={minutes}>
                    {minutes} minutos
                  </option>
                ))}
              </Select>
            </Field>
            <label className="flex min-h-11 items-center gap-2 rounded-[14px] bg-blue-50/60 px-3 text-sm font-semibold text-[#082F8B]">
              <input name="active" type="checkbox" defaultChecked />
              Ativo na agenda publica
            </label>
            <Button className="w-full gap-2">
              <Plus aria-hidden className="h-4 w-4" />
              Salvar horarios
            </Button>
          </div>
        </form>

          <form action={createScheduleBlock} className="min-w-0 rounded-[22px] border border-amber-100 bg-white/95 p-5 shadow-xl shadow-blue-950/5">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-amber-50 text-amber-700">
                <AlertTriangle aria-hidden className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-semibold text-amber-700">Excecao da agenda</p>
                <h2 className="font-display text-xl font-semibold text-[#082F8B]">Bloquear feriado ou folga</h2>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              <Field label="Aplicar para">
                <Select name="professionalId" defaultValue="">
                  <option value="">Todos os profissionais</option>
                  {activeProfessionals.map((professional) => (
                    <option key={professional.id} value={professional.id}>
                      {professional.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Data">
                <Input name="date" type="date" required />
              </Field>
              <Field label="Motivo">
                <Input name="reason" maxLength={80} placeholder="Ex.: Feriado, folga, curso ou manutencao" required />
              </Field>
              <div className="rounded-[16px] border border-amber-100 bg-amber-50/50 p-3">
                <p className="text-sm font-semibold text-amber-800">Bloqueio parcial</p>
                <p className="mt-1 text-xs leading-5 text-amber-700">Para bloquear o dia inteiro, deixe os horarios em branco.</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <Field label="Inicio">
                    <Input name="startTime" type="time" />
                  </Field>
                  <Field label="Fim">
                    <Input name="endTime" type="time" />
                  </Field>
                </div>
              </div>
              <label className="flex min-h-11 items-center gap-2 rounded-[14px] bg-blue-50/60 px-3 text-sm font-semibold text-[#082F8B]">
                <input name="active" type="checkbox" defaultChecked />
                Bloqueio ativo
              </label>
              <Button className="w-full gap-2" variant="secondary">
                <Plus aria-hidden className="h-4 w-4" />
                Salvar bloqueio
              </Button>
            </div>
          </form>
        </div>

        <div className="min-w-0 space-y-4">
          <div className="rounded-[22px] border border-white bg-white/95 p-4 shadow-xl shadow-blue-950/5">
            <form className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_160px_140px_auto]" action="/admin/horarios">
              <Field label="Profissional">
                <Select name="professionalId" defaultValue={selectedProfessionalId ?? ""}>
                  <option value="">Todas</option>
                  {professionals.map((professional) => (
                    <option key={professional.id} value={professional.id}>{professional.name}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Dia">
                <Select name="day" defaultValue={selectedDay === null ? "" : String(selectedDay)}>
                  <option value="">Todos</option>
                  {days.map((day) => (
                    <option key={day.value} value={day.value}>{day.label}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Status">
                <Select name="status" defaultValue={selectedStatus}>
                  {statusFilters.map((filter) => (
                    <option key={filter.value} value={filter.value}>{filter.label}</option>
                  ))}
                </Select>
              </Field>
              <Button className="gap-2 self-end" variant="secondary">
                <Search aria-hidden className="h-4 w-4" />
                Filtrar
              </Button>
            </form>
          </div>

          <ScheduleBlocksPanel scheduleBlocks={scheduleBlocks} />

          <CoveragePanel professionals={activeProfessionals} selectedProfessionalId={selectedProfessionalId} />

          <div className="overflow-hidden rounded-[22px] border border-white bg-white/95 shadow-xl shadow-blue-950/5">
            <div className="border-b border-blue-50 p-5">
              <h2 className="font-display text-xl font-semibold text-[#082F8B]">Horarios cadastrados</h2>
              <p className="mt-1 text-sm text-slate-500">Mostrando {schedules.length} janela(s) com os filtros atuais.</p>
            </div>
            <div className="divide-y divide-blue-50">
              {schedules.map((schedule) => (
                <ScheduleCard key={schedule.id} schedule={schedule} professionals={professionals} />
              ))}
              {schedules.length === 0 && (
                <div className="p-5">
                  <p className="rounded-[16px] bg-[#F3F4F6] px-4 py-3 text-sm font-medium text-slate-500">
                    Nenhum horario encontrado para esse filtro.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ScheduleBlocksPanel({
  scheduleBlocks
}: {
  scheduleBlocks: Array<{
    id: string;
    date: Date;
    startTime: string | null;
    endTime: string | null;
    reason: string;
    active: boolean;
    professional: { id: string; name: string } | null;
  }>;
}) {
  return (
    <div className="overflow-hidden rounded-[22px] border border-amber-100 bg-white/95 shadow-xl shadow-blue-950/5">
      <div className="border-b border-amber-100 bg-amber-50/50 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-semibold text-[#082F8B]">Bloqueios e feriados</h2>
            <p className="mt-1 text-sm text-slate-600">Datas bloqueadas nao aparecem para o cliente na tela de agendamento.</p>
          </div>
          <span className="rounded-full bg-white px-3 py-1 text-sm font-semibold text-amber-700">
            {scheduleBlocks.length} registro(s)
          </span>
        </div>
      </div>
      <div className="divide-y divide-amber-100">
        {scheduleBlocks.map((block) => (
          <article key={block.id} className="grid gap-4 p-5 2xl:grid-cols-[minmax(0,1fr)_220px] 2xl:items-start">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="break-words text-lg font-semibold text-[#082F8B]">{block.reason}</h3>
                <span className={block.active ? "rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700" : "rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500"}>
                  {block.active ? "Ativo" : "Inativo"}
                </span>
              </div>
              <p className="mt-1 text-sm font-semibold text-slate-600">
                {formatBlockDate(block.date)} - {block.professional?.name ?? "Todos os profissionais"}
              </p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <InfoPill icon={CalendarClock} label="Periodo" value={formatBlockPeriod(block)} />
                <InfoPill icon={UserRound} label="Alcance" value={block.professional?.name ?? "Geral"} />
              </div>
            </div>

            <div className="rounded-[18px] border border-amber-100 bg-amber-50/35 p-3">
              <p className="mb-3 text-sm font-semibold text-[#082F8B]">Acoes</p>
              <div className="grid gap-2 sm:grid-cols-2 2xl:grid-cols-1">
                <form action={toggleScheduleBlock}>
                  <input type="hidden" name="id" value={block.id} />
                  <input type="hidden" name="active" value={String(!block.active)} />
                  <Button className="w-full gap-2" variant="secondary">
                    <BadgeCheck aria-hidden className="h-4 w-4" />
                    {block.active ? "Desativar" : "Ativar"}
                  </Button>
                </form>
                <details className="rounded-[12px] bg-white">
                  <summary className="flex h-11 min-h-11 cursor-pointer list-none touch-manipulation items-center justify-center gap-2 rounded-[12px] bg-rose-500 px-4 text-sm font-semibold text-white shadow-sm shadow-rose-500/20 transition hover:bg-rose-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F5EF7] focus-visible:ring-offset-2">
                    <Trash2 aria-hidden className="h-4 w-4" />
                    Excluir
                  </summary>
                  <form action={deleteScheduleBlock} className="mt-2 rounded-[12px] border border-rose-100 bg-rose-50 p-2">
                    <input type="hidden" name="id" value={block.id} />
                    <p className="mb-2 text-xs font-medium text-rose-700">Remove este bloqueio da agenda publica.</p>
                    <Button className="w-full gap-2" variant="danger">
                      <Trash2 aria-hidden className="h-4 w-4" />
                      Confirmar
                    </Button>
                  </form>
                </details>
              </div>
            </div>
          </article>
        ))}
        {scheduleBlocks.length === 0 && (
          <div className="p-5">
            <p className="rounded-[16px] bg-[#F3F4F6] px-4 py-3 text-sm font-medium text-slate-500">
              Nenhum feriado ou bloqueio cadastrado.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function ScheduleCard({
  schedule,
  professionals
}: {
  schedule: {
    id: string;
    professionalId: string;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    intervalMinutes: number;
    active: boolean;
    professional: {
      id: string;
      name: string;
      services: Array<{ serviceId: string; service: { name: string; active: boolean } }>;
    };
  };
  professionals: Array<{ id: string; name: string; services: Array<{ service: { name: string } }> }>;
}) {
  return (
    <article className="p-5">
      <div className="grid gap-4 2xl:grid-cols-[minmax(0,1fr)_220px] 2xl:items-start">
        <div className="min-w-0">
          <div className="flex flex-wrap items-start gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[15px] bg-blue-50 text-[#0F5EF7]">
              <CalendarClock aria-hidden className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="break-words text-lg font-semibold text-[#082F8B]">{schedule.professional.name}</h3>
                <span className={schedule.active ? "rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700" : "rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500"}>
                  {schedule.active ? "Ativo" : "Inativo"}
                </span>
              </div>
              <p className="mt-1 text-sm font-semibold text-slate-600">
                {getDayLabel(schedule.dayOfWeek)} - {schedule.startTime} ate {schedule.endTime}
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            <InfoPill icon={Clock3} label="Intervalo" value={`${schedule.intervalMinutes} min`} />
            <InfoPill icon={CalendarClock} label="Duracao da janela" value={getWindowDuration(schedule.startTime, schedule.endTime)} />
            <InfoPill icon={BadgeCheck} label="Vagas aproximadas" value={String(getApproximateSlots(schedule.startTime, schedule.endTime, schedule.intervalMinutes))} />
          </div>

          <div className="mt-4 flex min-w-0 flex-wrap gap-2">
            {schedule.professional.services.map((item) => (
              <span key={item.serviceId} className={item.service.active ? "rounded-full bg-blue-50 px-3 py-1 text-sm font-semibold text-[#0F5EF7]" : "rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-500"}>
                {item.service.name}
              </span>
            ))}
            {schedule.professional.services.length === 0 && (
              <span className="rounded-full bg-amber-50 px-3 py-1 text-sm font-semibold text-amber-700">sem servico vinculado</span>
            )}
          </div>
        </div>

        <div className="rounded-[18px] border border-blue-50 bg-blue-50/35 p-3">
          <p className="mb-3 text-sm font-semibold text-[#082F8B]">Acoes</p>
          <div className="grid gap-2 sm:grid-cols-2 2xl:grid-cols-1">
            <form action={toggleSchedule}>
              <input type="hidden" name="id" value={schedule.id} />
              <input type="hidden" name="active" value={String(!schedule.active)} />
              <Button className="w-full gap-2" variant="secondary">
                <BadgeCheck aria-hidden className="h-4 w-4" />
                {schedule.active ? "Desativar" : "Ativar"}
              </Button>
            </form>
            <details className="rounded-[12px] bg-white">
              <summary className="flex h-11 min-h-11 cursor-pointer list-none touch-manipulation items-center justify-center gap-2 rounded-[12px] bg-rose-500 px-4 text-sm font-semibold text-white shadow-sm shadow-rose-500/20 transition hover:bg-rose-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F5EF7] focus-visible:ring-offset-2">
                <Trash2 aria-hidden className="h-4 w-4" />
                Excluir
              </summary>
              <form action={deleteSchedule} className="mt-2 rounded-[12px] border border-rose-100 bg-rose-50 p-2">
                <input type="hidden" name="id" value={schedule.id} />
                <p className="mb-2 text-xs font-medium text-rose-700">Remove esta janela de disponibilidade.</p>
                <Button className="w-full gap-2" variant="danger">
                  <Trash2 aria-hidden className="h-4 w-4" />
                  Confirmar
                </Button>
              </form>
            </details>
          </div>
        </div>
      </div>

      <details className="mt-4 rounded-[18px] border border-blue-100 bg-white">
        <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm font-semibold text-[#082F8B] transition hover:bg-blue-50">
          <Pencil aria-hidden className="h-4 w-4" />
          Editar horario
        </summary>
        <form action={updateSchedule} className="grid gap-3 border-t border-blue-50 p-4 xl:grid-cols-[1fr_150px_140px_140px_160px] xl:items-end">
          <input type="hidden" name="id" value={schedule.id} />
          <Field label="Profissional">
            <Select name="professionalId" defaultValue={schedule.professionalId} required>
              {professionals.map((professional) => (
                <option key={professional.id} value={professional.id}>
                  {professional.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Dia">
            <Select name="dayOfWeek" defaultValue={schedule.dayOfWeek} required>
              {days.map((day) => (
                <option key={day.value} value={day.value}>{day.label}</option>
              ))}
            </Select>
          </Field>
          <Field label="Inicio">
            <Input name="startTime" type="time" defaultValue={schedule.startTime} required />
          </Field>
          <Field label="Fim">
            <Input name="endTime" type="time" defaultValue={schedule.endTime} required />
          </Field>
          <Field label="Intervalo">
            <Input name="intervalMinutes" type="number" min={5} max={240} step={5} defaultValue={schedule.intervalMinutes} required />
          </Field>
          <label className="flex min-h-11 items-center gap-2 rounded-[14px] bg-blue-50/60 px-3 text-sm font-semibold text-[#082F8B] xl:col-span-2">
            <input name="active" type="checkbox" defaultChecked={schedule.active} />
            Ativo na agenda publica
          </label>
          <Button className="w-full gap-2 xl:col-span-3" variant="secondary">
            <Pencil aria-hidden className="h-4 w-4" />
            Atualizar horario
          </Button>
        </form>
      </details>
    </article>
  );
}

function CoveragePanel({
  professionals,
  selectedProfessionalId
}: {
  professionals: Array<{
    id: string;
    name: string;
    schedules: Array<{ id: string; dayOfWeek: number; active: boolean }>;
  }>;
  selectedProfessionalId: string | null;
}) {
  const rows = selectedProfessionalId ? professionals.filter((professional) => professional.id === selectedProfessionalId) : professionals;

  return (
    <div className="rounded-[22px] border border-white bg-white/95 p-4 shadow-xl shadow-blue-950/5">
      <div className="mb-3 flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-blue-50 text-[#0F5EF7]">
          <UserRound aria-hidden className="h-5 w-5" />
        </span>
        <div>
          <h2 className="font-display text-lg font-semibold text-[#082F8B]">Cobertura por profissional</h2>
          <p className="text-sm text-slate-500">Dias em verde possuem horario ativo.</p>
        </div>
      </div>
      <div className="grid gap-3">
        {rows.map((professional) => {
          const activeDays = new Set(professional.schedules.filter((schedule) => schedule.active).map((schedule) => schedule.dayOfWeek));
          return (
            <div key={professional.id} className="grid gap-2 rounded-[16px] bg-blue-50/40 p-3 lg:grid-cols-[minmax(0,180px)_1fr] lg:items-center">
              <p className="truncate text-sm font-semibold text-[#082F8B]">{professional.name}</p>
              <div className="grid grid-cols-7 gap-1.5">
                {days.map((day) => (
                  <span
                    key={day.value}
                    className={activeDays.has(day.value) ? "rounded-full bg-emerald-50 px-2 py-1 text-center text-xs font-bold text-emerald-700" : "rounded-full bg-white px-2 py-1 text-center text-xs font-bold text-slate-400"}
                  >
                    {day.short}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
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
  value: number | string;
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

function InfoPill({
  icon: Icon,
  label,
  value
}: {
  icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2 rounded-[14px] bg-[#F3F4F6] px-3 py-2 text-[#082F8B]">
      <Icon aria-hidden className="h-4 w-4 shrink-0" />
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase opacity-70">{label}</p>
        <p className="truncate text-sm font-semibold">{value}</p>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="space-y-1.5 text-sm font-semibold text-[#082F8B]">
      {label}
      {children}
    </label>
  );
}

function parseScheduleForm(formData: FormData): ScheduleFormInput | null {
  const professionalId = normalizeText(formData.get("professionalId"));
  const startTime = normalizeText(formData.get("startTime"));
  const endTime = normalizeText(formData.get("endTime"));
  const intervalMinutes = Number(formData.get("intervalMinutes"));

  if (professionalId.length < 1 || professionalId.length > 128) return null;
  if (!isValidTime(startTime) || !isValidTime(endTime)) return null;
  if (timeToMinutes(startTime) >= timeToMinutes(endTime)) return null;
  if (!Number.isInteger(intervalMinutes) || intervalMinutes < 5 || intervalMinutes > 240) return null;

  return {
    professionalId,
    startTime,
    endTime,
    intervalMinutes,
    active: formData.get("active") === "on"
  };
}

function parseScheduleBlockForm(formData: FormData): ScheduleBlockFormInput | null {
  const professionalId = normalizeText(formData.get("professionalId"));
  const date = normalizeText(formData.get("date"));
  const startTime = normalizeText(formData.get("startTime"));
  const endTime = normalizeText(formData.get("endTime"));
  const reason = normalizeText(formData.get("reason"));

  if (professionalId.length > 128) return null;
  if (!isValidDate(date)) return null;
  if (reason.length < 2 || reason.length > 80) return null;

  const hasStart = startTime.length > 0;
  const hasEnd = endTime.length > 0;
  if (hasStart !== hasEnd) return null;
  if (hasStart && (!isValidTime(startTime) || !isValidTime(endTime) || timeToMinutes(startTime) >= timeToMinutes(endTime))) {
    return null;
  }

  return {
    professionalId: professionalId || null,
    date: new Date(`${date}T00:00:00.000Z`),
    startTime: hasStart ? startTime : null,
    endTime: hasEnd ? endTime : null,
    reason,
    active: formData.get("active") === "on"
  };
}

function parseSelectedDays(formData: FormData) {
  return Array.from(new Set(formData.getAll("dayOfWeek").map(parseDay).filter((day): day is number => day !== null)));
}

function parseDay(value: FormDataEntryValue | string | null | undefined) {
  const day = Number(value);
  return Number.isInteger(day) && day >= 0 && day <= 6 ? day : null;
}

function buildScheduleWhere(
  professionalId: string | null,
  dayOfWeek: number | null,
  status: ScheduleStatusFilter
) {
  const where: {
    professionalId?: string;
    dayOfWeek?: number;
    active?: boolean;
  } = {};

  if (professionalId) where.professionalId = professionalId;
  if (dayOfWeek !== null) where.dayOfWeek = dayOfWeek;
  if (status === "active") where.active = true;
  if (status === "inactive") where.active = false;

  return where;
}

function parseProfessionalFilter(value: string | undefined) {
  const normalized = normalizeText(value);
  return normalized.length > 0 && normalized.length <= 128 ? normalized : null;
}

function parseDayFilter(value: string | undefined) {
  if (value === undefined || value === "") return null;
  return parseDay(value);
}

function parseStatusFilter(value: string | undefined): ScheduleStatusFilter {
  if (value === "active" || value === "inactive") return value;
  return "all";
}

function parseActionId(value: FormDataEntryValue | null) {
  const id = normalizeText(value);
  return id.length > 0 && id.length <= 128 ? id : null;
}

function normalizeText(value: FormDataEntryValue | string | null | undefined) {
  return String(value ?? "").trim().replace(/\s+/g, " ");
}

function isValidTime(value: string) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function isValidDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(`${value}T00:00:00`).getTime());
}

function timeToMinutes(value: string) {
  const [hour, minute] = value.split(":").map(Number);
  return hour * 60 + minute;
}

function getWindowDuration(startTime: string, endTime: string) {
  const minutes = Math.max(0, timeToMinutes(endTime) - timeToMinutes(startTime));
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest} min`;
  if (rest === 0) return `${hours}h`;
  return `${hours}h ${rest}min`;
}

function getApproximateSlots(startTime: string, endTime: string, intervalMinutes: number) {
  const minutes = Math.max(0, timeToMinutes(endTime) - timeToMinutes(startTime));
  return Math.floor(minutes / intervalMinutes);
}

function formatBlockDate(date: Date) {
  const dateKey = date.toISOString().slice(0, 10);
  return new Date(`${dateKey}T12:00:00`).toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });
}

function formatBlockPeriod(block: { startTime: string | null; endTime: string | null }) {
  if (!block.startTime || !block.endTime) return "Dia inteiro";
  return `${block.startTime} ate ${block.endTime}`;
}

function getDayLabel(value: number) {
  return days.find((day) => day.value === value)?.label ?? "Dia";
}

function getFirstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function revalidateSchedulePaths() {
  revalidatePath("/admin");
  revalidatePath("/admin/horarios");
  revalidatePath("/admin/profissionais");
  revalidatePath("/admin/agendamentos");
  revalidatePath("/agendar");
}
