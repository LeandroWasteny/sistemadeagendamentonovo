import { revalidatePath } from "next/cache";
import { Camera, MapPin, MessageCircle, Palette } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { prisma } from "@/lib/prisma";
import { defaultPublicBookingProfile } from "@/lib/booking/public-profile";

export const dynamic = "force-dynamic";

const profileId = "default";

async function saveProfile(formData: FormData) {
  "use server";

  const data = {
    businessName: String(formData.get("businessName") ?? "").trim(),
    tagline: String(formData.get("tagline") ?? "").trim(),
    logoUrl: String(formData.get("logoUrl") ?? "").trim(),
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
          <Field label="Logo publica" name="logoUrl" defaultValue={profile.logoUrl} required />
          <Field label="Endereco ou atendimento" name="address" defaultValue={profile.address} required />
          <Field label="WhatsApp" name="whatsappUrl" defaultValue={profile.whatsappUrl} required />
          <Field label="Instagram" name="instagramUrl" defaultValue={profile.instagramUrl} required />
        </div>

        <div className="mt-6 rounded-[18px] border border-blue-50 bg-blue-50/40 p-4">
          <div className="flex items-center gap-2">
            <Palette aria-hidden className="h-4 w-4 text-[#0F5EF7]" />
            <h2 className="font-display text-lg font-semibold text-[#082F8B]">Paleta publica</h2>
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
