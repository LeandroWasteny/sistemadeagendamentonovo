import Link from "next/link";
import { revalidatePath } from "next/cache";
import {
  AlertTriangle,
  BadgeCheck,
  BriefcaseBusiness,
  Clock3,
  Pencil,
  Plus,
  Search,
  Trash2,
  UsersRound
} from "lucide-react";
import type { ComponentType, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { requireAdmin } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/utils";
import { ServiceActionButton } from "./service-action-button";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
type ServiceStatusFilter = "all" | "active" | "inactive" | "without-professional";
type ServiceFormInput = {
  name: string;
  description: string;
  durationMinutes: number;
  priceCents: number;
};
type Tone = "blue" | "green" | "amber" | "rose" | "sky";

const statusFilters: Array<{ value: ServiceStatusFilter; label: string }> = [
  { value: "all", label: "Todos" },
  { value: "active", label: "Ativos" },
  { value: "inactive", label: "Inativos" },
  { value: "without-professional", label: "Sem profissional" }
];

const toneClasses: Record<Tone, string> = {
  blue: "bg-blue-50 text-[#0F5EF7]",
  green: "bg-emerald-50 text-[#22C55E]",
  amber: "bg-amber-50 text-amber-700",
  rose: "bg-rose-50 text-rose-700",
  sky: "bg-sky-50 text-[#38BDF8]"
};

async function createService(formData: FormData) {
  "use server";
  await requireAdmin();

  const input = parseServiceForm(formData);
  if (!input) return;

  await prisma.service.create({
    data: {
      ...input,
      active: formData.get("active") === "on"
    }
  });

  revalidateServicePaths();
}

async function toggleService(formData: FormData) {
  "use server";
  await requireAdmin();

  const id = parseActionId(formData.get("id"));
  if (!id) return;

  await prisma.service.update({
    where: { id },
    data: { active: formData.get("active") === "true" }
  });

  revalidateServicePaths();
}

async function updateService(formData: FormData) {
  "use server";
  await requireAdmin();

  const id = parseActionId(formData.get("id"));
  const input = parseServiceForm(formData);
  if (!id || !input) return;

  await prisma.service.update({
    where: { id },
    data: input
  });

  revalidateServicePaths();
}

async function deleteService(formData: FormData) {
  "use server";
  await requireAdmin();

  const id = parseActionId(formData.get("id"));
  if (!id) return;

  const service = await prisma.service.findUnique({
    where: { id },
    select: { _count: { select: { appointments: true } } }
  });

  if (!service || service._count.appointments > 0) return;

  await prisma.service.delete({ where: { id } });
  revalidateServicePaths();
}

export default async function ServicesPage({ searchParams }: { searchParams?: SearchParams }) {
  await requireAdmin();

  const params = (await searchParams) ?? {};
  const status = parseStatusFilter(getFirstValue(params.status));
  const query = normalizeText(getFirstValue(params.q) ?? "");
  const where = buildServiceWhere(status, query);

  const [services, totalServices, activeTotal, inactiveTotal, withoutProfessionalTotal] = await Promise.all([
    prisma.service.findMany({
      where,
      include: {
        professionals: { include: { professional: true } },
        _count: { select: { appointments: true } }
      },
      orderBy: [{ active: "desc" }, { createdAt: "desc" }]
    }),
    prisma.service.count(),
    prisma.service.count({ where: { active: true } }),
    prisma.service.count({ where: { active: false } }),
    prisma.service.count({ where: { professionals: { none: {} } } })
  ]);
  const averagePrice =
    totalServices > 0
      ? Math.round(
          services.reduce((sum, service) => sum + service.priceCents, 0) / Math.max(services.length, 1)
        )
      : 0;

  return (
    <section className="space-y-6">
      <div className="overflow-hidden rounded-[24px] border border-white bg-white/95 shadow-xl shadow-blue-950/5">
        <div className="grid gap-5 p-5 md:p-6 xl:grid-cols-[1fr_auto] xl:items-center">
          <div>
            <p className="text-sm font-semibold text-[#0F5EF7]">Catalogo comercial</p>
            <h1 className="font-display mt-1 text-balance text-2xl font-semibold text-[#082F8B] md:text-3xl">
              Servicos do agendamento
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Organize duracao, preco, status e vinculo com profissionais antes de liberar o servico para o cliente.
            </p>
          </div>
          <Link
            href="/agendar"
            className="inline-flex h-11 min-h-11 touch-manipulation items-center justify-center gap-2 rounded-[12px] bg-[#0F5EF7] px-4 text-sm font-semibold text-white shadow-sm shadow-blue-500/20 transition hover:bg-[#0B4FD9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F5EF7] focus-visible:ring-offset-2"
          >
            <BriefcaseBusiness aria-hidden className="h-4 w-4" />
            Ver tela publica
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={BriefcaseBusiness} label="Total" value={totalServices} helper="servicos cadastrados" tone="blue" />
        <MetricCard icon={BadgeCheck} label="Ativos" value={activeTotal} helper="visiveis para agenda" tone="green" />
        <MetricCard icon={AlertTriangle} label="Sem profissional" value={withoutProfessionalTotal} helper="precisam de vinculo" tone="amber" />
        <MetricCard icon={Clock3} label="Preco medio" value={formatCurrency(averagePrice)} helper="nos filtros atuais" tone="sky" />
      </div>

      <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(320px,400px)_minmax(0,1fr)]">
        <form action={createService} className="min-w-0 rounded-[22px] border border-white bg-white/95 p-5 shadow-xl shadow-blue-950/5">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-blue-50 text-[#0F5EF7]">
              <Plus aria-hidden className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-semibold text-[#0F5EF7]">Novo item</p>
              <h2 className="font-display text-xl font-semibold text-[#082F8B]">Cadastrar servico</h2>
            </div>
          </div>
          <div className="mt-5 space-y-3">
            <Field label="Nome">
              <Input name="name" maxLength={80} placeholder="Ex.: Corte feminino" required />
            </Field>
            <Field label="Descricao">
              <Textarea name="description" maxLength={240} placeholder="Resumo curto para aparecer na tela de agendamento" required />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Duracao">
                <Input name="durationMinutes" type="number" min="5" max="480" step="5" placeholder="60" required />
              </Field>
              <Field label="Preco">
                <Input name="price" type="number" min="0" max="99999" step="0.01" placeholder="90.00" required />
              </Field>
            </div>
            <label className="flex min-h-11 items-center gap-2 rounded-[14px] bg-blue-50/60 px-3 text-sm font-semibold text-[#082F8B]">
              <input name="active" type="checkbox" defaultChecked />
              Ativo na tela publica
            </label>
            <ServiceActionButton className="w-full gap-2" pendingLabel="Salvando...">
              <Plus aria-hidden className="h-4 w-4" />
              Salvar servico
            </ServiceActionButton>
          </div>
        </form>

        <div className="min-w-0 space-y-4">
          <div className="rounded-[22px] border border-white bg-white/95 p-4 shadow-xl shadow-blue-950/5">
            <form className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]" action="/admin/servicos">
              <div className="relative">
                <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input name="q" defaultValue={query} placeholder="Buscar servico por nome ou descricao" className="pl-9" />
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
              <h2 className="font-display text-xl font-semibold text-[#082F8B]">Servicos cadastrados</h2>
              <p className="mt-1 text-sm text-slate-500">
                Mostrando {services.length} registro(s) com os filtros atuais.
              </p>
            </div>
            <div className="divide-y divide-blue-50">
              {services.map((service) => (
                <ServiceCard key={service.id} service={service} />
              ))}
              {services.length === 0 && (
                <div className="p-5">
                  <p className="rounded-[16px] bg-[#F3F4F6] px-4 py-3 text-sm font-medium text-slate-500">
                    Nenhum servico encontrado para esse filtro.
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

function ServiceCard({
  service
}: {
  service: {
    id: string;
    name: string;
    description: string;
    durationMinutes: number;
    priceCents: number;
    active: boolean;
    professionals: Array<{ professionalId: string; professional: { name: string; active: boolean } }>;
    _count: { appointments: number };
  };
}) {
  const canDelete = service._count.appointments === 0;

  return (
    <article className="p-5">
      <div className="grid gap-4 2xl:grid-cols-[minmax(0,1fr)_260px] 2xl:items-start">
        <div className="min-w-0">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="break-words text-lg font-semibold text-[#082F8B]">{service.name}</h3>
                <span
                  className={
                    service.active
                      ? "rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700"
                      : "rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500"
                  }
                >
                  {service.active ? "Ativo" : "Inativo"}
                </span>
              </div>
              <p className="mt-2 max-w-3xl break-words text-sm leading-6 text-slate-500">{service.description}</p>
            </div>
            <p className="rounded-[14px] bg-blue-50 px-4 py-2 text-lg font-semibold text-[#0F5EF7]">
              {formatCurrency(service.priceCents)}
            </p>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            <InfoPill icon={Clock3} label="Duracao" value={`${service.durationMinutes} min`} />
            <InfoPill icon={UsersRound} label="Profissionais" value={String(service.professionals.length)} />
            <InfoPill icon={BriefcaseBusiness} label="Agendamentos" value={String(service._count.appointments)} />
          </div>

          <div className="mt-4 flex min-w-0 flex-wrap gap-2">
            {service.professionals.map((item) => (
              <span
                key={item.professionalId}
                className={
                  item.professional.active
                    ? "rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-[#22C55E]"
                    : "rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-500"
                }
              >
                {item.professional.name}
              </span>
            ))}
            {service.professionals.length === 0 && (
              <span className="rounded-full bg-amber-50 px-3 py-1 text-sm font-semibold text-amber-700">
                sem profissional vinculado
              </span>
            )}
          </div>
        </div>

        <div className="rounded-[18px] border border-blue-50 bg-blue-50/35 p-3">
          <p className="mb-3 text-sm font-semibold text-[#082F8B]">Acoes do servico</p>
          <div className="grid gap-2 sm:grid-cols-2 2xl:grid-cols-1">
            <form action={toggleService}>
              <input type="hidden" name="id" value={service.id} />
              <input type="hidden" name="active" value={String(!service.active)} />
              <ServiceActionButton pendingLabel="Alterando..." variant="secondary">
                <BadgeCheck aria-hidden className="h-4 w-4" />
                {service.active ? "Desativar" : "Ativar"}
              </ServiceActionButton>
            </form>
            {canDelete ? (
              <details className="rounded-[12px] bg-white">
                <summary className="flex h-11 min-h-11 cursor-pointer list-none touch-manipulation items-center justify-center gap-2 rounded-[12px] bg-rose-500 px-4 text-sm font-semibold text-white shadow-sm shadow-rose-500/20 transition hover:bg-rose-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F5EF7] focus-visible:ring-offset-2">
                  <Trash2 aria-hidden className="h-4 w-4" />
                  Excluir
                </summary>
                <form action={deleteService} className="mt-2 rounded-[12px] border border-rose-100 bg-rose-50 p-2">
                  <input type="hidden" name="id" value={service.id} />
                  <p className="mb-2 text-xs font-medium text-rose-700">Exclui apenas servicos sem historico.</p>
                  <ServiceActionButton pendingLabel="Excluindo..." variant="danger">
                    <Trash2 aria-hidden className="h-4 w-4" />
                    Confirmar exclusao
                  </ServiceActionButton>
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
        <form action={updateService} className="grid gap-3 border-t border-blue-50 p-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_110px_120px_auto] xl:items-end">
          <input type="hidden" name="id" value={service.id} />
          <Field label="Nome">
            <Input name="name" defaultValue={service.name} maxLength={80} required />
          </Field>
          <Field label="Descricao">
            <Input name="description" defaultValue={service.description} maxLength={240} required />
          </Field>
          <Field label="Minutos">
            <Input name="durationMinutes" type="number" min="5" max="480" step="5" defaultValue={service.durationMinutes} required />
          </Field>
          <Field label="Preco">
            <Input name="price" type="number" min="0" max="99999" step="0.01" defaultValue={service.priceCents / 100} required />
          </Field>
          <ServiceActionButton className="w-full gap-2 xl:w-auto" pendingLabel="Atualizando..." variant="secondary">
            <Pencil aria-hidden className="h-4 w-4" />
            Atualizar
          </ServiceActionButton>
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

function parseServiceForm(formData: FormData): ServiceFormInput | null {
  const name = normalizeText(formData.get("name"));
  const description = normalizeText(formData.get("description"));
  const durationMinutes = Number(formData.get("durationMinutes"));
  const price = Number(formData.get("price"));

  if (name.length < 2 || name.length > 80) return null;
  if (description.length < 2 || description.length > 240) return null;
  if (!Number.isFinite(durationMinutes) || durationMinutes < 5 || durationMinutes > 480) return null;
  if (!Number.isFinite(price) || price < 0 || price > 99999) return null;

  return {
    name,
    description,
    durationMinutes: Math.round(durationMinutes),
    priceCents: Math.round(price * 100)
  };
}

function parseActionId(value: FormDataEntryValue | null) {
  const id = normalizeText(value);
  return id.length > 0 && id.length <= 128 ? id : null;
}

function parseStatusFilter(value: string | undefined): ServiceStatusFilter {
  if (value === "active" || value === "inactive" || value === "without-professional") return value;
  return "all";
}

function buildServiceWhere(status: ServiceStatusFilter, query: string) {
  const where: {
    active?: boolean;
    professionals?: { none: Record<string, never> };
    OR?: Array<{ name?: { contains: string; mode: "insensitive" }; description?: { contains: string; mode: "insensitive" } }>;
  } = {};

  if (status === "active") where.active = true;
  if (status === "inactive") where.active = false;
  if (status === "without-professional") where.professionals = { none: {} };
  if (query) {
    where.OR = [
      { name: { contains: query, mode: "insensitive" } },
      { description: { contains: query, mode: "insensitive" } }
    ];
  }

  return where;
}

function buildFilterHref({ status, query }: { status: ServiceStatusFilter; query: string }) {
  const params = new URLSearchParams();
  if (status !== "all") params.set("status", status);
  if (query) params.set("q", query);
  const suffix = params.toString();
  return suffix ? `/admin/servicos?${suffix}` : "/admin/servicos";
}

function normalizeText(value: FormDataEntryValue | string | null | undefined) {
  return String(value ?? "").trim().replace(/\s+/g, " ");
}

function getFirstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function revalidateServicePaths() {
  revalidatePath("/admin");
  revalidatePath("/admin/servicos");
  revalidatePath("/agendar");
}
