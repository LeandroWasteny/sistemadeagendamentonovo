import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import sharp from "sharp";
import {
  AlertTriangle,
  BadgePercent,
  BadgeCheck,
  CalendarClock,
  Camera,
  Clock3,
  Eye,
  ImagePlus,
  Pencil,
  Phone,
  Plus,
  Search,
  Scissors,
  Trash2,
  UserRound,
  UsersRound
} from "lucide-react";
import type { ComponentType, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { requireAdmin } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
type ProfessionalStatusFilter = "all" | "active" | "inactive" | "without-service" | "without-schedule";
type Tone = "blue" | "green" | "amber" | "rose" | "sky";
type ProfessionalFormInput = {
  name: string;
  phone: string;
  specialties: string;
  commissionPercent: number;
};

const statusFilters: Array<{ value: ProfessionalStatusFilter; label: string }> = [
  { value: "all", label: "Todas" },
  { value: "active", label: "Ativas" },
  { value: "inactive", label: "Inativas" },
  { value: "without-service", label: "Sem servico" },
  { value: "without-schedule", label: "Sem horario" }
];

const toneClasses: Record<Tone, string> = {
  blue: "bg-blue-50 text-[#0F5EF7]",
  green: "bg-emerald-50 text-[#22C55E]",
  amber: "bg-amber-50 text-amber-700",
  rose: "bg-rose-50 text-rose-700",
  sky: "bg-sky-50 text-[#38BDF8]"
};

const maxPhotoSizeBytes = 2 * 1024 * 1024;
const maxPhotoPixels = 16_000_000;
const allowedPhotoTypes = new Set(["image/png", "image/jpeg", "image/webp"]);

async function createProfessional(formData: FormData) {
  "use server";
  await requireAdmin();

  const input = parseProfessionalForm(formData);
  if (!input) return;
  const serviceIds = await getValidServiceIds(formData);
  const photoUrl = await resolveProfessionalPhotoUrlOrRedirect(formData, null);

  await prisma.$transaction(async (tx) => {
    const professional = await tx.professional.create({
      data: {
        ...input,
        photoUrl,
        active: formData.get("active") === "on"
      }
    });

    if (serviceIds.length > 0) {
      await tx.professionalService.createMany({
        data: serviceIds.map((serviceId) => ({ professionalId: professional.id, serviceId })),
        skipDuplicates: true
      });
    }
  });

  revalidateProfessionalPaths();
}

async function toggleProfessional(formData: FormData) {
  "use server";
  await requireAdmin();

  const id = parseActionId(formData.get("id"));
  if (!id) return;

  await prisma.professional.update({
    where: { id },
    data: { active: formData.get("active") === "true" }
  });

  revalidateProfessionalPaths();
}

async function updateProfessional(formData: FormData) {
  "use server";
  await requireAdmin();

  const id = parseActionId(formData.get("id"));
  const input = parseProfessionalForm(formData);
  if (!id || !input) return;
  const serviceIds = await getValidServiceIds(formData);
  const current = await prisma.professional.findUnique({ where: { id }, select: { photoUrl: true } });
  if (!current) return;
  const photoUrl = await resolveProfessionalPhotoUrlOrRedirect(formData, current.photoUrl);

  await prisma.$transaction(async (tx) => {
    await tx.professional.update({
      where: { id },
      data: { ...input, photoUrl }
    });
    await tx.professionalService.deleteMany({ where: { professionalId: id } });
    if (serviceIds.length > 0) {
      await tx.professionalService.createMany({
        data: serviceIds.map((serviceId) => ({ professionalId: id, serviceId })),
        skipDuplicates: true
      });
    }
  });

  revalidateProfessionalPaths();
}

async function deleteProfessional(formData: FormData) {
  "use server";
  await requireAdmin();

  const id = parseActionId(formData.get("id"));
  if (!id) return;

  const professional = await prisma.professional.findUnique({
    where: { id },
    select: { _count: { select: { appointments: true } } }
  });

  if (!professional || professional._count.appointments > 0) return;

  await prisma.professional.delete({ where: { id } });
  revalidateProfessionalPaths();
}

export default async function ProfessionalsPage({ searchParams }: { searchParams?: SearchParams }) {
  await requireAdmin();

  const params = (await searchParams) ?? {};
  const status = parseStatusFilter(getFirstValue(params.status));
  const query = normalizeText(getFirstValue(params.q) ?? "");
  const photoError = getFirstValue(params.photoError);
  const where = buildProfessionalWhere(status, query);
  const now = new Date();

  const [
    professionals,
    services,
    totalProfessionals,
    activeTotal,
    inactiveTotal,
    withoutServiceTotal,
    withoutScheduleTotal,
    futureAppointmentRows
  ] = await Promise.all([
    prisma.professional.findMany({
      where,
      include: {
        services: { include: { service: true }, orderBy: { service: { name: "asc" } } },
        schedules: { where: { active: true }, select: { id: true, dayOfWeek: true } },
        _count: { select: { appointments: true } }
      },
      orderBy: [{ active: "desc" }, { name: "asc" }]
    }),
    prisma.service.findMany({ orderBy: [{ active: "desc" }, { sortOrder: "asc" }, { name: "asc" }] }),
    prisma.professional.count(),
    prisma.professional.count({ where: { active: true } }),
    prisma.professional.count({ where: { active: false } }),
    prisma.professional.count({ where: { active: true, services: { none: { service: { active: true } } } } }),
    prisma.professional.count({ where: { active: true, schedules: { none: { active: true } } } }),
    prisma.appointment.groupBy({
      by: ["professionalId"],
      where: {
        startsAt: { gte: now },
        status: { not: "CANCELLED" }
      },
      _count: { _all: true }
    })
  ]);

  const futureAppointmentsByProfessional = new Map(
    futureAppointmentRows.map((row) => [row.professionalId, row._count._all])
  );

  return (
    <section className="space-y-6">
      <div className="overflow-hidden rounded-[24px] border border-white bg-white/95 shadow-xl shadow-blue-950/5">
        <div className="grid gap-5 p-5 md:p-6 xl:grid-cols-[1fr_auto] xl:items-center">
          <div>
            <p className="text-sm font-semibold text-[#0F5EF7]">Equipe de atendimento</p>
            <h1 className="font-display mt-1 text-balance text-2xl font-semibold text-[#082F8B] md:text-3xl">
              Profissionais
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Cadastre profissionais, vincule servicos e acompanhe pendencias que bloqueiam a agenda publica.
            </p>
          </div>
          <Link
            href="/admin/horarios"
            className="inline-flex h-11 min-h-11 touch-manipulation items-center justify-center gap-2 rounded-[12px] bg-[#0F5EF7] px-4 text-sm font-semibold text-white shadow-sm shadow-blue-500/20 transition hover:bg-[#0B4FD9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F5EF7] focus-visible:ring-offset-2"
          >
            <CalendarClock aria-hidden className="h-4 w-4" />
            Ajustar horarios
          </Link>
        </div>
      </div>

      {photoError && (
        <div className="flex gap-3 rounded-[18px] border border-amber-100 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800 shadow-sm shadow-amber-500/10">
          <AlertTriangle aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
          {photoError}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard icon={UsersRound} label="Total" value={totalProfessionals} helper="profissionais cadastradas" tone="blue" />
        <MetricCard icon={BadgeCheck} label="Ativas" value={activeTotal} helper="visiveis na agenda" tone="green" />
        <MetricCard icon={Clock3} label="Inativas" value={inactiveTotal} helper="fora da tela publica" tone="sky" />
        <MetricCard icon={AlertTriangle} label="Sem servico" value={withoutServiceTotal} helper="precisam de vinculo" tone="amber" />
        <MetricCard icon={CalendarClock} label="Sem horario" value={withoutScheduleTotal} helper="nao recebem vagas" tone="rose" />
      </div>

      <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(320px,400px)_minmax(0,1fr)]">
        <form action={createProfessional} encType="multipart/form-data" className="min-w-0 rounded-[22px] border border-white bg-white/95 p-5 shadow-xl shadow-blue-950/5">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-blue-50 text-[#0F5EF7]">
              <Plus aria-hidden className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-semibold text-[#0F5EF7]">Nova integrante</p>
              <h2 className="font-display text-xl font-semibold text-[#082F8B]">Cadastrar profissional</h2>
            </div>
          </div>
          <div className="mt-5 space-y-3">
            <Field label="Nome">
              <Input name="name" maxLength={80} placeholder="Ex.: Camila Rocha" required />
            </Field>
            <Field label="WhatsApp">
              <Input name="phone" maxLength={24} inputMode="tel" placeholder="Ex.: 85988887777" required />
            </Field>
            <Field label="Especialidades">
              <Textarea name="specialties" maxLength={240} placeholder="Ex.: cortes, escovas e finalizacao" required />
            </Field>
            <PhotoUploadField />
            <Field label="Comissao (%)">
              <Input name="commissionPercent" type="number" min={0} max={100} step={1} defaultValue={0} required />
            </Field>
            <ServiceChecklist services={services} selectedIds={services.filter((service) => service.active).map((service) => service.id)} />
            <label className="flex min-h-11 items-center gap-2 rounded-[14px] bg-blue-50/60 px-3 text-sm font-semibold text-[#082F8B]">
              <input name="active" type="checkbox" defaultChecked />
              Ativa na tela publica
            </label>
            <Button className="w-full gap-2">
              <Plus aria-hidden className="h-4 w-4" />
              Salvar profissional
            </Button>
          </div>
        </form>

        <div className="min-w-0 space-y-4">
          <div className="rounded-[22px] border border-white bg-white/95 p-4 shadow-xl shadow-blue-950/5">
            <form className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]" action="/admin/profissionais">
              <div className="relative">
                <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input name="q" defaultValue={query} placeholder="Buscar por nome, WhatsApp ou especialidade" className="pl-9" />
              </div>
              {status !== "all" && <input type="hidden" name="status" value={status} />}
              <Button className="gap-2" variant="secondary">
                <Search aria-hidden className="h-4 w-4" />
                Buscar
              </Button>
            </form>
            <div className="mt-3 flex flex-wrap gap-2">
              {statusFilters.map((filter) => (
                <FilterLink key={filter.value} active={status === filter.value} href={buildFilterHref({ status: filter.value, query })}>
                  {filter.label}
                </FilterLink>
              ))}
            </div>
          </div>

          <div className="overflow-hidden rounded-[22px] border border-white bg-white/95 shadow-xl shadow-blue-950/5">
            <div className="border-b border-blue-50 p-5">
              <h2 className="font-display text-xl font-semibold text-[#082F8B]">Profissionais cadastradas</h2>
              <p className="mt-1 text-sm text-slate-500">Mostrando {professionals.length} registro(s) com os filtros atuais.</p>
            </div>
            <div className="divide-y divide-blue-50">
              {professionals.map((professional) => (
                <ProfessionalCard
                  key={professional.id}
                  professional={professional}
                  services={services}
                  futureAppointments={futureAppointmentsByProfessional.get(professional.id) ?? 0}
                />
              ))}
              {professionals.length === 0 && (
                <div className="p-5">
                  <p className="rounded-[16px] bg-[#F3F4F6] px-4 py-3 text-sm font-medium text-slate-500">
                    Nenhuma profissional encontrada para esse filtro.
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

function ProfessionalCard({
  professional,
  services,
  futureAppointments
}: {
  professional: {
    id: string;
    name: string;
    phone: string;
    specialties: string;
    photoUrl: string | null;
    commissionPercent: number;
    active: boolean;
    services: Array<{ serviceId: string; service: { name: string; active: boolean } }>;
    schedules: Array<{ id: string; dayOfWeek: number }>;
    _count: { appointments: number };
  };
  services: Array<{ id: string; name: string; active: boolean }>;
  futureAppointments: number;
}) {
  const selectedServiceIds = professional.services.map((item) => item.serviceId);
  const canDelete = professional._count.appointments === 0;

  return (
    <article className="p-5">
      <div className="grid gap-4 2xl:grid-cols-[minmax(0,1fr)_250px] 2xl:items-start">
        <div className="min-w-0">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-[14px] bg-blue-50 text-[#0F5EF7]">
                  {professional.photoUrl ? (
                    <img src={professional.photoUrl} alt={professional.name} className="h-full w-full object-cover" />
                  ) : (
                    <UserRound aria-hidden className="h-5 w-5" />
                  )}
                </span>
                <div className="min-w-0">
                  <h3 className="break-words text-lg font-semibold text-[#082F8B]">{professional.name}</h3>
                  <p className="mt-0.5 flex items-center gap-1.5 text-sm font-medium text-slate-500">
                    <Phone aria-hidden className="h-4 w-4" />
                    {professional.phone}
                  </p>
                </div>
                <span className={professional.active ? "rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700" : "rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500"}>
                  {professional.active ? "Ativa" : "Inativa"}
                </span>
              </div>
              <p className="mt-3 max-w-3xl break-words text-sm leading-6 text-slate-500">{professional.specialties}</p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-[repeat(auto-fit,minmax(132px,1fr))] gap-2">
            <InfoPill icon={Scissors} label="Servicos" value={String(professional.services.length)} />
            <InfoPill icon={CalendarClock} label="Dias com horario" value={String(new Set(professional.schedules.map((item) => item.dayOfWeek)).size)} tone={professional.schedules.length > 0 ? "neutral" : "warning"} />
            <InfoPill icon={Clock3} label="Futuros" value={String(futureAppointments)} />
            <InfoPill icon={BadgePercent} label="Comissao" value={`${professional.commissionPercent}%`} />
            <InfoPill icon={UsersRound} label="Historico" value={String(professional._count.appointments)} />
          </div>

          <div className="mt-4 flex min-w-0 flex-wrap gap-2">
            {professional.services.map((item) => (
              <span
                key={item.serviceId}
                className={item.service.active ? "rounded-full bg-blue-50 px-3 py-1 text-sm font-semibold text-[#0F5EF7]" : "rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-500"}
              >
                {item.service.name}
              </span>
            ))}
            {professional.services.length === 0 && (
              <span className="rounded-full bg-amber-50 px-3 py-1 text-sm font-semibold text-amber-700">sem servico vinculado</span>
            )}
            {professional.schedules.length === 0 && (
              <Link href="/admin/horarios" className="rounded-full bg-rose-50 px-3 py-1 text-sm font-semibold text-rose-700 transition hover:bg-rose-100">
                sem horario cadastrado
              </Link>
            )}
          </div>
        </div>

        <div className="rounded-[18px] border border-blue-50 bg-blue-50/35 p-3">
          <p className="mb-3 text-sm font-semibold text-[#082F8B]">Acoes da profissional</p>
          <div className="grid gap-2 sm:grid-cols-2 2xl:grid-cols-1">
            <Link
              href={`/admin/profissionais/${professional.id}`}
              className="inline-flex h-11 min-h-11 touch-manipulation items-center justify-center gap-2 rounded-[12px] bg-[#0F5EF7] px-4 text-sm font-semibold text-white shadow-sm shadow-blue-500/20 transition hover:bg-[#0B4FD9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F5EF7] focus-visible:ring-offset-2"
            >
              <Eye aria-hidden className="h-4 w-4" />
              Agenda
            </Link>
            <form action={toggleProfessional}>
              <input type="hidden" name="id" value={professional.id} />
              <input type="hidden" name="active" value={String(!professional.active)} />
              <Button className="w-full gap-2" variant="secondary">
                <BadgeCheck aria-hidden className="h-4 w-4" />
                {professional.active ? "Desativar" : "Ativar"}
              </Button>
            </form>
            {canDelete ? (
              <details className="rounded-[12px] bg-white">
                <summary className="flex h-11 min-h-11 cursor-pointer list-none touch-manipulation items-center justify-center gap-2 rounded-[12px] bg-rose-500 px-4 text-sm font-semibold text-white shadow-sm shadow-rose-500/20 transition hover:bg-rose-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F5EF7] focus-visible:ring-offset-2">
                  <Trash2 aria-hidden className="h-4 w-4" />
                  Excluir
                </summary>
                <form action={deleteProfessional} className="mt-2 rounded-[12px] border border-rose-100 bg-rose-50 p-2">
                  <input type="hidden" name="id" value={professional.id} />
                  <p className="mb-2 text-xs font-medium text-rose-700">Exclui apenas profissionais sem historico.</p>
                  <Button className="w-full gap-2" variant="danger">
                    <Trash2 aria-hidden className="h-4 w-4" />
                    Confirmar exclusao
                  </Button>
                </form>
              </details>
            ) : (
              <Button className="w-full gap-2" disabled variant="secondary">
                <Trash2 aria-hidden className="h-4 w-4" />
                Com historico
              </Button>
            )}
          </div>
        </div>
      </div>

      <details className="mt-4 rounded-[18px] border border-blue-100 bg-white">
        <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm font-semibold text-[#082F8B] transition hover:bg-blue-50">
          <Pencil aria-hidden className="h-4 w-4" />
          Editar informacoes
        </summary>
        <form action={updateProfessional} encType="multipart/form-data" className="grid gap-3 border-t border-blue-50 p-4 xl:grid-cols-[minmax(0,1fr)_180px_minmax(0,1fr)] xl:items-end">
          <input type="hidden" name="id" value={professional.id} />
          <div className="xl:col-span-3">
            <PhotoUploadField currentPhotoUrl={professional.photoUrl} professionalName={professional.name} allowRemove />
          </div>
          <Field label="Nome">
            <Input name="name" defaultValue={professional.name} maxLength={80} required />
          </Field>
          <Field label="WhatsApp">
            <Input name="phone" defaultValue={professional.phone} maxLength={24} inputMode="tel" required />
          </Field>
          <Field label="Comissao (%)">
            <Input name="commissionPercent" type="number" min={0} max={100} step={1} defaultValue={professional.commissionPercent} required />
          </Field>
          <Field label="Especialidades">
            <Input name="specialties" defaultValue={professional.specialties} maxLength={240} required />
          </Field>
          <div className="xl:col-span-3">
            <ServiceChecklist services={services} selectedIds={selectedServiceIds} />
          </div>
          <Button className="w-full gap-2 xl:col-span-3" variant="secondary">
            <Pencil aria-hidden className="h-4 w-4" />
            Atualizar profissional
          </Button>
        </form>
      </details>
    </article>
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

function ServiceChecklist({
  services,
  selectedIds
}: {
  services: Array<{ id: string; name: string; active: boolean }>;
  selectedIds: string[];
}) {
  return (
    <fieldset className="rounded-[16px] border border-blue-100 bg-blue-50/40 p-3">
      <legend className="px-1 text-sm font-semibold text-[#082F8B]">Servicos que atende</legend>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        {services.map((service) => (
          <label key={service.id} className="flex min-h-9 items-center gap-2 text-sm font-medium text-slate-600">
            <input name="serviceIds" type="checkbox" value={service.id} defaultChecked={selectedIds.includes(service.id)} />
            <span className="min-w-0 truncate">
              {service.name}
              {!service.active && <span className="text-slate-400"> (inativo)</span>}
            </span>
          </label>
        ))}
        {services.length === 0 && <p className="text-sm font-medium text-slate-500">Cadastre um servico antes de vincular profissionais.</p>}
      </div>
    </fieldset>
  );
}

function PhotoUploadField({
  currentPhotoUrl,
  professionalName,
  allowRemove = false
}: {
  currentPhotoUrl?: string | null;
  professionalName?: string;
  allowRemove?: boolean;
}) {
  return (
    <div className="rounded-[16px] border border-blue-100 bg-blue-50/40 p-3">
      <div className="flex flex-wrap items-center gap-3">
        <span className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-[18px] border border-blue-100 bg-white text-[#0F5EF7]">
          {currentPhotoUrl ? (
            <img src={currentPhotoUrl} alt={professionalName ?? "Foto da profissional"} className="h-full w-full object-cover" />
          ) : (
            <Camera aria-hidden className="h-6 w-6" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-[#082F8B]">Foto da profissional</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            Use PNG, JPG ou WebP ate 2 MB. Recomendado: imagem quadrada, minimo 512 x 512 px.
          </p>
        </div>
      </div>
      <label className="mt-3 flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-[12px] bg-white px-3 text-sm font-semibold text-[#0F5EF7] ring-1 ring-blue-100 transition hover:bg-blue-50">
        <ImagePlus aria-hidden className="h-4 w-4" />
        {currentPhotoUrl ? "Trocar foto" : "Enviar foto"}
        <input name="photoFile" type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" />
      </label>
      {allowRemove && currentPhotoUrl && (
        <label className="mt-2 flex min-h-10 items-center gap-2 rounded-[12px] bg-white px-3 text-sm font-semibold text-rose-700 ring-1 ring-rose-100">
          <input name="removePhoto" type="checkbox" value="1" />
          Remover foto atual
        </label>
      )}
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
  tone?: "neutral" | "warning";
}) {
  const toneClass = tone === "warning" ? "bg-amber-50 text-amber-700" : "bg-[#F3F4F6] text-[#082F8B]";
  return (
    <div className={`grid min-h-[72px] min-w-0 grid-cols-[18px_minmax(0,1fr)] items-center gap-2 rounded-[14px] px-3 py-3 ${toneClass}`}>
      <Icon aria-hidden className="h-4 w-4 shrink-0" />
      <div className="min-w-0">
        <p className="text-[11px] font-bold uppercase leading-4 opacity-70">{label}</p>
        <p className="text-base font-semibold leading-5">{value}</p>
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

function parseProfessionalForm(formData: FormData): ProfessionalFormInput | null {
  const name = normalizeText(formData.get("name"));
  const phone = normalizePhone(formData.get("phone"));
  const specialties = normalizeText(formData.get("specialties"));
  const commissionPercent = Number(formData.get("commissionPercent") ?? 0);

  if (name.length < 2 || name.length > 80) return null;
  if (phone.length < 8 || phone.length > 20) return null;
  if (specialties.length < 2 || specialties.length > 240) return null;
  if (!Number.isFinite(commissionPercent) || commissionPercent < 0 || commissionPercent > 100) return null;

  return { name, phone, specialties, commissionPercent: Math.round(commissionPercent) };
}

async function resolveProfessionalPhotoUrlOrRedirect(formData: FormData, currentPhotoUrl: string | null) {
  try {
    return await resolveProfessionalPhotoUrl(formData, currentPhotoUrl);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Nao foi possivel processar a foto.";
    redirect(`/admin/profissionais?photoError=${encodeURIComponent(message)}`);
  }
}

async function resolveProfessionalPhotoUrl(formData: FormData, currentPhotoUrl: string | null) {
  if (formData.get("removePhoto") === "1") return null;

  const file = formData.get("photoFile");
  if (!(file instanceof File) || file.size === 0) return currentPhotoUrl;

  if (!allowedPhotoTypes.has(file.type)) {
    throw new Error("Formato invalido. Envie PNG, JPG ou WebP.");
  }

  if (file.size > maxPhotoSizeBytes) {
    throw new Error("Foto muito grande. Envie uma imagem com ate 2 MB.");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const image = await sharp(buffer, { limitInputPixels: maxPhotoPixels })
    .rotate()
    .resize(512, 512, { fit: "cover", position: "center" })
    .webp({ quality: 86 })
    .toBuffer();

  return `data:image/webp;base64,${image.toString("base64")}`;
}

async function getValidServiceIds(formData: FormData) {
  const ids = Array.from(new Set(formData.getAll("serviceIds").map((value) => normalizeText(value)).filter((value) => value.length > 0 && value.length <= 128)));
  if (ids.length === 0) return [];
  const services = await prisma.service.findMany({
    where: { id: { in: ids } },
    select: { id: true }
  });
  return services.map((service) => service.id);
}

function buildProfessionalWhere(status: ProfessionalStatusFilter, query: string) {
  const where: {
    active?: boolean;
    services?: { none: { service?: { active: boolean } } };
    schedules?: { none: { active: boolean } };
    OR?: Array<{ name?: { contains: string; mode: "insensitive" }; phone?: { contains: string; mode: "insensitive" }; specialties?: { contains: string; mode: "insensitive" } }>;
  } = {};

  if (status === "active") where.active = true;
  if (status === "inactive") where.active = false;
  if (status === "without-service") where.services = { none: { service: { active: true } } };
  if (status === "without-schedule") where.schedules = { none: { active: true } };
  if (query) {
    where.OR = [
      { name: { contains: query, mode: "insensitive" } },
      { phone: { contains: query, mode: "insensitive" } },
      { specialties: { contains: query, mode: "insensitive" } }
    ];
  }

  return where;
}

function parseActionId(value: FormDataEntryValue | null) {
  const id = normalizeText(value);
  return id.length > 0 && id.length <= 128 ? id : null;
}

function parseStatusFilter(value: string | undefined): ProfessionalStatusFilter {
  if (value === "active" || value === "inactive" || value === "without-service" || value === "without-schedule") return value;
  return "all";
}

function buildFilterHref({ status, query }: { status: ProfessionalStatusFilter; query: string }) {
  const params = new URLSearchParams();
  if (status !== "all") params.set("status", status);
  if (query) params.set("q", query);
  const suffix = params.toString();
  return suffix ? `/admin/profissionais?${suffix}` : "/admin/profissionais";
}

function normalizeText(value: FormDataEntryValue | string | null | undefined) {
  return String(value ?? "").trim().replace(/\s+/g, " ");
}

function normalizePhone(value: FormDataEntryValue | null) {
  return String(value ?? "").replace(/[^\d+]/g, "");
}

function getFirstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function revalidateProfessionalPaths() {
  revalidatePath("/admin");
  revalidatePath("/admin/profissionais");
  revalidatePath("/admin/horarios");
  revalidatePath("/admin/financeiro");
  revalidatePath("/agendar");
}
