import { revalidatePath } from "next/cache";
import { BadgePercent, CalendarDays, CheckCircle2, Plus, TicketPercent, Trash2 } from "lucide-react";
import type { ComponentType, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { requireAdmin } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { normalizeCouponCode } from "@/lib/services/pricing";
import { formatCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";

type CouponDiscountType = "PERCENT" | "FIXED";
type Tone = "blue" | "green" | "amber" | "rose";

const toneClasses: Record<Tone, string> = {
  blue: "bg-blue-50 text-[#0F5EF7]",
  green: "bg-emerald-50 text-[#22C55E]",
  amber: "bg-amber-50 text-amber-700",
  rose: "bg-rose-50 text-rose-700"
};

async function createCoupon(formData: FormData) {
  "use server";
  await requireAdmin();

  const input = parseCouponForm(formData);
  if (!input) return;

  await prisma.coupon
    .create({ data: input })
    .catch((error) => {
      if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") return null;
      throw error;
    });

  revalidateCouponPaths();
}

async function toggleCoupon(formData: FormData) {
  "use server";
  await requireAdmin();

  const id = parseActionId(formData.get("id"));
  if (!id) return;

  await prisma.coupon.update({
    where: { id },
    data: { active: formData.get("active") === "true" }
  });

  revalidateCouponPaths();
}

async function deleteCoupon(formData: FormData) {
  "use server";
  await requireAdmin();

  const id = parseActionId(formData.get("id"));
  if (!id) return;

  const coupon = await prisma.coupon.findUnique({
    where: { id },
    select: { _count: { select: { appointments: true } } }
  });

  if (!coupon || coupon._count.appointments > 0) return;

  await prisma.coupon.delete({ where: { id } });
  revalidateCouponPaths();
}

export default async function CouponsPage() {
  await requireAdmin();

  const [coupons, activeTotal, usedTotal] = await Promise.all([
    prisma.coupon.findMany({
      include: { _count: { select: { appointments: true } } },
      orderBy: [{ active: "desc" }, { createdAt: "desc" }]
    }),
    prisma.coupon.count({ where: { active: true } }),
    prisma.appointment.count({ where: { couponId: { not: null } } })
  ]);

  return (
    <section className="space-y-6">
      <div className="rounded-[24px] border border-white bg-white/95 p-5 shadow-xl shadow-blue-950/5 md:p-6">
        <p className="text-sm font-semibold text-[#0F5EF7]">Campanhas comerciais</p>
        <h1 className="font-display mt-1 text-2xl font-semibold text-[#082F8B] md:text-3xl">Cupons</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
          Crie descontos por porcentagem ou valor fixo para divulgar em campanhas, Instagram e WhatsApp.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard icon={TicketPercent} label="Cupons" value={coupons.length} helper="cadastrados" tone="blue" />
        <MetricCard icon={CheckCircle2} label="Ativos" value={activeTotal} helper="liberados para uso" tone="green" />
        <MetricCard icon={BadgePercent} label="Usos" value={usedTotal} helper="agendamentos com cupom" tone="amber" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[390px_1fr]">
        <form action={createCoupon} className="rounded-[22px] border border-white bg-white/95 p-5 shadow-xl shadow-blue-950/5">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-blue-50 text-[#0F5EF7]">
              <Plus aria-hidden className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-semibold text-[#0F5EF7]">Novo cupom</p>
              <h2 className="font-display text-xl font-semibold text-[#082F8B]">Criar campanha</h2>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            <Field label="Nome">
              <Input name="name" maxLength={80} placeholder="Ex.: Cliente novo" required />
            </Field>
            <Field label="Codigo">
              <Input name="code" maxLength={32} placeholder="BEMVINDO10" required />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Tipo">
                <select
                  name="discountType"
                  className="h-11 w-full rounded-[12px] border border-blue-100 bg-white px-3 text-sm text-slate-700 outline-none focus:border-[#0F5EF7] focus:ring-2 focus:ring-blue-100"
                  defaultValue="PERCENT"
                >
                  <option value="PERCENT">Porcentagem</option>
                  <option value="FIXED">Valor fixo</option>
                </select>
              </Field>
              <Field label="Desconto">
                <Input name="discountValue" type="number" min="1" max="99999" step="0.01" placeholder="10" required />
              </Field>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Pedido minimo">
                <Input name="minAmount" type="number" min="0" max="99999" step="0.01" placeholder="0" />
              </Field>
              <Field label="Limite de uso">
                <Input name="usageLimit" type="number" min="1" max="999999" step="1" placeholder="Opcional" />
              </Field>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Inicio">
                <Input name="startsAt" type="date" />
              </Field>
              <Field label="Fim">
                <Input name="endsAt" type="date" />
              </Field>
            </div>
            <label className="flex min-h-11 items-center gap-2 rounded-[14px] bg-blue-50/60 px-3 text-sm font-semibold text-[#082F8B]">
              <input name="active" type="checkbox" defaultChecked />
              Ativo para clientes
            </label>
            <Button className="h-11 w-full gap-2 rounded-[12px] bg-[#0F5EF7] text-white hover:bg-[#082F8B]">
              <Plus aria-hidden className="h-4 w-4" />
              Salvar cupom
            </Button>
          </div>
        </form>

        <div className="overflow-hidden rounded-[22px] border border-white bg-white/95 shadow-xl shadow-blue-950/5">
          <div className="border-b border-blue-50 p-5">
            <h2 className="font-display text-xl font-semibold text-[#082F8B]">Cupons cadastrados</h2>
            <p className="mt-1 text-sm text-slate-500">Controle campanhas sem alterar o preço base dos serviços.</p>
          </div>
          <div className="divide-y divide-blue-50">
            {coupons.map((coupon) => (
              <article key={coupon.id} className="grid gap-4 p-5 lg:grid-cols-[1fr_220px] lg:items-start">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="break-words text-lg font-semibold text-[#082F8B]">{coupon.name}</h3>
                    <span className={coupon.active ? "rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700" : "rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500"}>
                      {coupon.active ? "Ativo" : "Inativo"}
                    </span>
                  </div>
                  <p className="mt-2 font-mono text-sm font-bold text-[#0F5EF7]">{coupon.code}</p>
                  <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                    <InfoPill label="Desconto" value={formatDiscount(coupon.discountType, coupon.discountValue)} />
                    <InfoPill label="Minimo" value={formatCurrency(coupon.minAmountCents)} />
                    <InfoPill label="Uso" value={`${coupon.usedCount}/${coupon.usageLimit ?? "sem limite"}`} />
                    <InfoPill label="Periodo" value={formatCouponPeriod(coupon.startsAt, coupon.endsAt)} />
                  </div>
                </div>

                <div className="grid gap-2">
                  <form action={toggleCoupon}>
                    <input type="hidden" name="id" value={coupon.id} />
                    <input type="hidden" name="active" value={String(!coupon.active)} />
                    <Button className="h-11 w-full rounded-[12px]" variant="secondary">
                      {coupon.active ? "Desativar" : "Ativar"}
                    </Button>
                  </form>
                  {coupon._count.appointments === 0 ? (
                    <form action={deleteCoupon}>
                      <input type="hidden" name="id" value={coupon.id} />
                      <Button className="h-11 w-full gap-2 rounded-[12px]" variant="danger">
                        <Trash2 aria-hidden className="h-4 w-4" />
                        Excluir
                      </Button>
                    </form>
                  ) : (
                    <Button className="h-11 w-full rounded-[12px]" disabled variant="secondary">
                      Com historico
                    </Button>
                  )}
                </div>
              </article>
            ))}
            {coupons.length === 0 && <EmptyState>Nenhum cupom cadastrado ainda.</EmptyState>}
          </div>
        </div>
      </div>
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
        <p className="text-3xl font-semibold leading-none tabular-nums text-[#082F8B]">{value}</p>
        <p className="mt-1 truncate text-sm font-semibold text-[#082F8B]">{label}</p>
        <p className="mt-0.5 truncate text-xs text-slate-500">{helper}</p>
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

function InfoPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[14px] bg-[#F3F4F6] px-3 py-2">
      <p className="text-xs font-semibold uppercase text-slate-500">{label}</p>
      <p className="truncate text-sm font-semibold text-[#082F8B]">{value}</p>
    </div>
  );
}

function EmptyState({ children }: { children: ReactNode }) {
  return <p className="m-5 rounded-[16px] bg-[#F3F4F6] px-4 py-3 text-sm font-medium text-slate-500">{children}</p>;
}

function parseCouponForm(formData: FormData) {
  const name = normalizeText(formData.get("name"));
  const code = normalizeCouponCode(normalizeText(formData.get("code")));
  const discountType = parseDiscountType(formData.get("discountType"));
  const discountValueRaw = Number(formData.get("discountValue"));
  const minAmountRaw = Number(formData.get("minAmount") || 0);
  const usageLimitRaw = normalizeText(formData.get("usageLimit"));
  const startsAt = parseOptionalDate(formData.get("startsAt"), "start");
  const endsAt = parseOptionalDate(formData.get("endsAt"), "end");

  if (name.length < 2 || name.length > 80) return null;
  if (code.length < 3 || code.length > 32) return null;
  if (!discountType) return null;
  if (!Number.isFinite(discountValueRaw) || discountValueRaw <= 0) return null;
  if (!Number.isFinite(minAmountRaw) || minAmountRaw < 0) return null;
  if (startsAt.invalid || endsAt.invalid) return null;
  if (startsAt.value && endsAt.value && startsAt.value > endsAt.value) return null;

  const usageLimit = usageLimitRaw ? Number(usageLimitRaw) : null;
  if (usageLimit !== null && (!Number.isFinite(usageLimit) || usageLimit < 1)) return null;

  const discountValue =
    discountType === "PERCENT"
      ? Math.min(95, Math.round(discountValueRaw))
      : Math.round(discountValueRaw * 100);

  return {
    name,
    code,
    discountType,
    discountValue,
    minAmountCents: Math.round(minAmountRaw * 100),
    usageLimit: usageLimit === null ? null : Math.round(usageLimit),
    startsAt: startsAt.value,
    endsAt: endsAt.value,
    active: formData.get("active") === "on"
  };
}

function parseDiscountType(value: FormDataEntryValue | null): CouponDiscountType | null {
  return value === "PERCENT" || value === "FIXED" ? value : null;
}

function parseActionId(value: FormDataEntryValue | null) {
  const id = normalizeText(value);
  return id.length > 0 && id.length <= 128 ? id : null;
}

function parseOptionalDate(value: FormDataEntryValue | null, mode: "start" | "end") {
  const raw = normalizeText(value);
  if (!raw) return { value: null, invalid: false };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return { value: null, invalid: true };
  return {
    value: new Date(`${raw}T${mode === "start" ? "00:00:00.000" : "23:59:59.999"}-03:00`),
    invalid: false
  };
}

function normalizeText(value: FormDataEntryValue | string | null | undefined) {
  return String(value ?? "").trim().replace(/\s+/g, " ");
}

function formatDiscount(type: CouponDiscountType, value: number) {
  return type === "PERCENT" ? `${value}%` : formatCurrency(value);
}

function formatCouponPeriod(startsAt: Date | null, endsAt: Date | null) {
  if (startsAt && endsAt) return `${formatDate(startsAt)} ate ${formatDate(endsAt)}`;
  if (startsAt) return `a partir de ${formatDate(startsAt)}`;
  if (endsAt) return `ate ${formatDate(endsAt)}`;
  return "sempre";
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(value);
}

function revalidateCouponPaths() {
  revalidatePath("/admin/cupons");
  revalidatePath("/admin/financeiro");
  revalidatePath("/admin/relatorios");
  revalidatePath("/agendar");
}
