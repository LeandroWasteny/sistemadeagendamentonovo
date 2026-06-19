import { revalidatePath } from "next/cache";
import { Camera, MapPin, MessageCircle, Palette } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { prisma } from "@/lib/prisma";
import { defaultPublicBookingProfile } from "@/lib/booking/public-profile";

export const dynamic = "force-dynamic";

const profileId = "default";
const maxLogoSizeBytes = 2 * 1024 * 1024;
const allowedLogoTypes = new Set(["image/png", "image/jpeg", "image/webp", "image/svg+xml"]);

async function saveProfile(formData: FormData) {
  "use server";

  const logoUrl = await resolveLogoUrl(formData);
  const data = {
    businessName: String(formData.get("businessName") ?? "").trim(),
    tagline: String(formData.get("tagline") ?? "").trim(),
    logoUrl,
    address: String(formData.get("address") ?? "").trim(),
    whatsappUrl: String(formData.get("whatsappUrl") ?? "").trim(),
    instagramUrl: String(formData.get("instagramUrl") ?? "").trim(),
    primaryColor: String(formData.get("primaryColor") ?? "").trim(),
    primaryDark: String(formData.get("primaryDark") ?? "").trim(),
    accentColor: String(formData.get("accentColor") ?? "").trim(),
    accentSoft: String(formData.get("accentSoft") ?? "").trim(),
    backgroundColor: String(formData.get("backgroundColor") ?? "").trim(),
    surfaceColor: String(formData.get("surfaceColor") ?? "").trim(),
    textColor: String(formData.get("textColor") ?? "").trim(),
    mutedColor: String(formData.get("mutedColor") ?? "").trim()
  };

  await prisma.businessProfile.upsert({
    where: { id: profileId },
    update: data,
    create: { id: profileId, ...data }
  });

  revalidatePath("/admin/perfil");
  revalidatePath("/agendar");
  revalidatePath("/agendar/consultar");
}

async function restoreDefaultPalette() {
  "use server";

  const palette = defaultPublicBookingProfile.palette;
  const data = {
    primaryColor: palette.primary,
    primaryDark: palette.primaryDark,
    accentColor: palette.accent,
    accentSoft: palette.accentSoft,
    backgroundColor: palette.background,
    surfaceColor: palette.surface,
    textColor: palette.text,
    mutedColor: palette.muted
  };

  await prisma.businessProfile.upsert({
    where: { id: profileId },
    update: data,
    create: {
      id: profileId,
      businessName: defaultPublicBookingProfile.businessName,
      tagline: defaultPublicBookingProfile.tagline,
      logoUrl: defaultPublicBookingProfile.logoUrl,
      address: defaultPublicBookingProfile.address,
      whatsappUrl: defaultPublicBookingProfile.whatsappUrl,
      instagramUrl: defaultPublicBookingProfile.instagramUrl,
      ...data
    }
  });

  revalidatePath("/admin/perfil");
  revalidatePath("/agendar");
  revalidatePath("/agendar/consultar");
}

export default async function BusinessProfilePage() {
  const savedProfile = await prisma.businessProfile.findUnique({ where: { id: profileId } });
  const profile = savedProfile
    ? {
        businessName: savedProfile.businessName,
        tagline: savedProfile.tagline,
        logoUrl: savedProfile.logoUrl,
        address: savedProfile.address,
        whatsappUrl: savedProfile.whatsappUrl,
        instagramUrl: savedProfile.instagramUrl,
        primaryColor: savedProfile.primaryColor,
        primaryDark: savedProfile.primaryDark,
        accentColor: savedProfile.accentColor,
        accentSoft: savedProfile.accentSoft,
        backgroundColor: savedProfile.backgroundColor,
        surfaceColor: savedProfile.surfaceColor,
        textColor: savedProfile.textColor,
        mutedColor: savedProfile.mutedColor
      }
    : {
        businessName: defaultPublicBookingProfile.businessName,
        tagline: defaultPublicBookingProfile.tagline,
        logoUrl: defaultPublicBookingProfile.logoUrl,
        address: defaultPublicBookingProfile.address,
        whatsappUrl: defaultPublicBookingProfile.whatsappUrl,
        instagramUrl: defaultPublicBookingProfile.instagramUrl,
        primaryColor: defaultPublicBookingProfile.palette.primary,
        primaryDark: defaultPublicBookingProfile.palette.primaryDark,
        accentColor: defaultPublicBookingProfile.palette.accent,
        accentSoft: defaultPublicBookingProfile.palette.accentSoft,
        backgroundColor: defaultPublicBookingProfile.palette.background,
        surfaceColor: defaultPublicBookingProfile.palette.surface,
        textColor: defaultPublicBookingProfile.palette.text,
        mutedColor: defaultPublicBookingProfile.palette.muted
      };

  return (
    <section className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <form action={saveProfile} className="min-w-0 rounded-[20px] border border-white bg-white/95 p-5 shadow-xl shadow-blue-950/5">
        <p className="text-sm font-semibold text-[#0F5EF7]">Configuracao publica</p>
        <h1 className="font-display mt-1 text-2xl font-semibold text-[#082F8B]">Perfil do negocio</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
          Essas informacoes aparecem na tela publica de agendamento dos clientes.
        </p>

        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <Field label="Nome do negocio" name="businessName" defaultValue={profile.businessName} required />
          <Field label="Frase curta" name="tagline" defaultValue={profile.tagline} required />
          <LogoField defaultValue={profile.logoUrl} />
          <Field label="Endereco ou atendimento" name="address" defaultValue={profile.address} required />
          <Field label="WhatsApp" name="whatsappUrl" defaultValue={profile.whatsappUrl} required />
          <Field label="Instagram" name="instagramUrl" defaultValue={profile.instagramUrl} required />
        </div>

        <div className="mt-6 rounded-[18px] border border-blue-50 bg-blue-50/40 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Palette aria-hidden className="h-4 w-4 text-[#0F5EF7]" />
              <h2 className="font-display text-lg font-semibold text-[#082F8B]">Paleta publica</h2>
            </div>
            <button
              type="submit"
              formAction={restoreDefaultPalette}
              formNoValidate
              className="inline-flex h-10 items-center justify-center rounded-[12px] border border-blue-100 bg-white px-3 text-sm font-semibold text-[#0F5EF7] transition hover:border-[#0F5EF7] hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F5EF7] focus-visible:ring-offset-2"
            >
              Restaurar padrao
            </button>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <ColorField label="Primaria" name="primaryColor" defaultValue={profile.primaryColor} />
            <ColorField label="Azul marinho" name="primaryDark" defaultValue={profile.primaryDark} />
            <ColorField label="Confirmacao" name="accentColor" defaultValue={profile.accentColor} />
            <ColorField label="Confirmacao suave" name="accentSoft" defaultValue={profile.accentSoft} />
            <ColorField label="Fundo" name="backgroundColor" defaultValue={profile.backgroundColor} />
            <ColorField label="Superficie" name="surfaceColor" defaultValue={profile.surfaceColor} />
            <ColorField label="Texto" name="textColor" defaultValue={profile.textColor} />
            <ColorField label="Texto suave" name="mutedColor" defaultValue={profile.mutedColor} />
          </div>
        </div>

        <Button className="mt-6 w-full sm:w-auto">Salvar perfil</Button>
      </form>

      <aside className="min-w-0 rounded-[20px] border border-white bg-white/95 p-5 shadow-xl shadow-blue-950/5">
        <p className="text-sm font-semibold text-[#0F5EF7]">Previa</p>
        <h2 className="font-display mt-1 text-xl font-semibold text-[#082F8B]">Como aparece para o cliente</h2>
        <div className="mt-5 rounded-[24px] p-4 text-white" style={{ backgroundColor: profile.primaryDark }}>
          <div className="flex items-center gap-3 rounded-[18px] bg-white p-3 text-[#082F8B]">
            <img src={profile.logoUrl} alt="" className="h-12 w-12 rounded-[14px] object-contain" />
            <div className="min-w-0">
              <p className="truncate text-lg font-semibold">{profile.businessName}</p>
              <p className="text-sm font-medium text-slate-500">{profile.tagline}</p>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            <PreviewItem icon={MapPin} label={profile.address} />
            <PreviewItem icon={MessageCircle} label="WhatsApp" />
            <PreviewItem icon={Camera} label="Instagram" />
          </div>
        </div>
      </aside>
    </section>
  );
}

function Field({
  label,
  name,
  defaultValue,
  required
}: {
  label: string;
  name: string;
  defaultValue: string;
  required?: boolean;
}) {
  return (
    <label className="space-y-1.5 text-sm font-semibold text-[#082F8B]">
      {label}
      <Input name={name} defaultValue={defaultValue} required={required} />
    </label>
  );
}

function LogoField({ defaultValue }: { defaultValue: string }) {
  const hasUploadedLogo = defaultValue.startsWith("data:");

  return (
    <div className="space-y-2 lg:col-span-2">
      <input type="hidden" name="currentLogoUrl" value={defaultValue} />
      <label className="space-y-1.5 text-sm font-semibold text-[#082F8B]">
        Link do logo
        <Input
          name="logoUrl"
          defaultValue={hasUploadedLogo ? "" : defaultValue}
          placeholder={hasUploadedLogo ? "Logo enviado por upload" : "/brand/logo-icon.png"}
        />
      </label>
      <label className="block space-y-1.5 text-sm font-semibold text-[#082F8B]">
        Enviar novo logo
        <input
          name="logoFile"
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml"
          className="block w-full rounded-[12px] border border-blue-100 bg-white px-3 py-2 text-sm text-slate-500 file:mr-3 file:rounded-[10px] file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-[#0F5EF7]"
        />
      </label>
      <p className="text-xs font-medium leading-5 text-slate-500">
        Se enviar um arquivo, ele substitui o link acima. Use PNG, JPG, WebP ou SVG com ate 2 MB.
        {hasUploadedLogo ? " Ja existe um logo enviado por upload." : ""}
      </p>
    </div>
  );
}

function ColorField({ label, name, defaultValue }: { label: string; name: string; defaultValue: string }) {
  return (
    <label className="space-y-1.5 text-sm font-semibold text-[#082F8B]">
      {label}
      <span className="flex gap-2">
        <input
          name={name}
          type="color"
          defaultValue={defaultValue}
          className="h-11 w-12 shrink-0 rounded-[12px] border border-blue-100 bg-white p-1"
          aria-label={label}
        />
        <span className="inline-flex h-11 min-w-0 flex-1 items-center rounded-[12px] border border-blue-100 bg-white px-3 font-mono text-xs text-slate-500">
          {defaultValue}
        </span>
      </span>
    </label>
  );
}

function PreviewItem({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <div className="flex items-center gap-3 rounded-[16px] bg-white/10 px-3 py-3 text-sm font-semibold text-white/90">
      <Icon aria-hidden className="h-4 w-4 shrink-0" />
      <span className="min-w-0 truncate">{label}</span>
    </div>
  );
}

async function resolveLogoUrl(formData: FormData) {
  const linkUrl = String(formData.get("logoUrl") ?? "").trim();
  const currentLogoUrl = String(formData.get("currentLogoUrl") ?? "").trim();
  const fallbackUrl = linkUrl || currentLogoUrl;
  const logoFile = formData.get("logoFile");

  if (!(logoFile instanceof File) || logoFile.size === 0) return fallbackUrl;

  if (!allowedLogoTypes.has(logoFile.type)) {
    throw new Error("Formato de logo invalido. Use PNG, JPG, WebP ou SVG.");
  }

  if (logoFile.size > maxLogoSizeBytes) {
    throw new Error("Logo muito grande. Envie um arquivo com ate 2 MB.");
  }

  const bytes = Buffer.from(await logoFile.arrayBuffer());
  return `data:${logoFile.type};base64,${bytes.toString("base64")}`;
}
