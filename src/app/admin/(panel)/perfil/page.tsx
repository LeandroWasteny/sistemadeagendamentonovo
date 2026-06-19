import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Camera, MapPin, MessageCircle, Palette } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import sharp from "sharp";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { prisma } from "@/lib/prisma";
import { defaultPublicBookingProfile } from "@/lib/booking/public-profile";
import { BusinessLogoField } from "./business-logo-field";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const profileId = "default";
const maxLogoSizeBytes = 2 * 1024 * 1024;
const maxLogoPixels = 16_000_000;
const allowedLogoTypes = new Set(["image/png", "image/jpeg", "image/webp"]);

async function saveProfile(formData: FormData) {
  "use server";

  let logoUrl: string;

  try {
    logoUrl = await resolveLogoUrl(formData);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Nao foi possivel processar o logo.";
    redirect(`/admin/perfil?logoError=${encodeURIComponent(message)}`);
  }

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

export default async function BusinessProfilePage({
  searchParams
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const logoError = getSearchParam(params, "logoError");
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
        {logoError ? (
          <div className="mt-4 rounded-[16px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
            {logoError}
          </div>
        ) : null}

        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <Field label="Nome do negocio" name="businessName" defaultValue={profile.businessName} required />
          <Field label="Frase curta" name="tagline" defaultValue={profile.tagline} required />
          <BusinessLogoField defaultValue={profile.logoUrl} defaultLogoUrl={defaultPublicBookingProfile.logoUrl} />
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
            <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-[14px] bg-white">
              <img src={profile.logoUrl} alt="" className="h-full w-full object-contain" />
            </span>
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
  const removeLogo = String(formData.get("removeLogo") ?? "") === "1";
  const linkUrl = String(formData.get("logoUrl") ?? "").trim();
  const logoFile = formData.get("logoFile");

  if (removeLogo) return defaultPublicBookingProfile.logoUrl;
  if (!(logoFile instanceof File) || logoFile.size === 0) {
    if (linkUrl) return validateLogoLink(linkUrl);

    const currentProfile = await prisma.businessProfile.findUnique({
      where: { id: profileId },
      select: { logoUrl: true }
    });

    return currentProfile?.logoUrl || defaultPublicBookingProfile.logoUrl;
  }

  const mimeType = logoFile.type || inferMimeType(logoFile.name);
  if (!allowedLogoTypes.has(mimeType)) {
    throw new Error("Formato de logo invalido. Use PNG, JPG ou WebP.");
  }

  if (logoFile.size > maxLogoSizeBytes) {
    throw new Error("Logo muito grande. Envie um arquivo com ate 2 MB.");
  }

  const bytes = Buffer.from(await logoFile.arrayBuffer());
  const normalizedLogo = await sharp(bytes, { limitInputPixels: maxLogoPixels })
    .rotate()
    .resize(512, 512, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    })
    .webp({ quality: 86 })
    .toBuffer();

  return `data:image/webp;base64,${normalizedLogo.toString("base64")}`;
}

function validateLogoLink(url: string) {
  if (!url) return defaultPublicBookingProfile.logoUrl;
  if (url.startsWith("data:")) throw new Error("Cole um link do logo ou envie o arquivo pelo botao Trocar logo.");
  if (url.length > 2048) throw new Error("Link do logo muito longo.");
  if (url.startsWith("/") || url.startsWith("http://") || url.startsWith("https://")) return url;
  throw new Error("Use um link de logo valido, comecando por /, http:// ou https://.");
}

function inferMimeType(fileName: string) {
  const extension = fileName.toLowerCase().split(".").pop();
  if (extension === "png") return "image/png";
  if (extension === "jpg" || extension === "jpeg") return "image/jpeg";
  if (extension === "webp") return "image/webp";
  return "";
}

function getSearchParam(params: Record<string, string | string[] | undefined> | undefined, key: string) {
  const value = params?.[key];
  return Array.isArray(value) ? value[0] : value;
}
