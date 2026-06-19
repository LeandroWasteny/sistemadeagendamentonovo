import { Camera, MapPin, MessageCircle } from "lucide-react";
import type { CSSProperties } from "react";
import { getPublicBookingProfile } from "@/lib/booking/public-profile";
import { prisma } from "@/lib/prisma";
import { BookingForm } from "./booking-form";

export const dynamic = "force-dynamic";

export default async function BookingPage() {
  const [profile, services, professionals] = await Promise.all([
    getPublicBookingProfile(),
    prisma.service.findMany({
      where: { active: true },
      include: {
        professionals: {
          where: { professional: { active: true } },
          select: { professionalId: true }
        }
      },
      orderBy: { name: "asc" }
    }),
    prisma.professional.findMany({
      where: {
        active: true,
        services: { some: { service: { active: true } } }
      },
      include: { services: { select: { serviceId: true } } },
      orderBy: { name: "asc" }
    })
  ]);

  const themeStyle = {
    "--booking-primary": profile.palette.primary,
    "--booking-primary-dark": profile.palette.primaryDark,
    "--booking-accent": profile.palette.accent,
    "--booking-accent-soft": profile.palette.accentSoft,
    "--booking-bg": profile.palette.background,
    "--booking-surface": profile.palette.surface,
    "--booking-text": profile.palette.text,
    "--booking-muted": profile.palette.muted
  } as CSSProperties;

  return (
    <main
      className="min-h-screen bg-[var(--booking-bg)] px-3 py-4 text-[var(--booking-text)] sm:px-4 md:py-6"
      style={themeStyle}
    >
      <section className="mx-auto grid max-w-6xl gap-4 lg:grid-cols-[320px_1fr]">
        <aside className="flex rounded-[24px] border border-blue-100 bg-white p-3 text-[var(--booking-text)] shadow-xl shadow-blue-950/10 sm:rounded-[28px] sm:p-4 lg:sticky lg:top-6 lg:h-[calc(100vh-3rem)] lg:min-h-[640px] lg:flex-col lg:border-0 lg:bg-[var(--booking-primary-dark)] lg:text-white lg:shadow-2xl lg:shadow-blue-950/15">
          <div className="flex w-full items-center gap-3 rounded-[18px] bg-transparent p-0 text-[var(--booking-text)] lg:rounded-[22px] lg:bg-white/95 lg:p-3">
            <img
              src={profile.logoUrl}
              alt={profile.businessName}
              width={56}
              height={56}
              className="h-12 w-12 shrink-0 rounded-[14px] object-contain sm:h-14 sm:w-14 sm:rounded-[18px]"
            />
            <div className="min-w-0">
              <h1 className="font-display truncate text-xl font-semibold">{profile.businessName}</h1>
              <p className="text-sm font-medium text-[var(--booking-muted)]">{profile.tagline}</p>
            </div>
          </div>

          <ContactBlock
            address={profile.address}
            whatsappUrl={profile.whatsappUrl}
            instagramUrl={profile.instagramUrl}
            className="mt-auto hidden lg:block"
            addressClassName="bg-white/10 text-white/85"
            linksClassName="mt-2 grid gap-2"
            linkClassName="bg-white/10 text-white shadow-none hover:bg-white/15 focus-visible:ring-white"
          />
        </aside>

        <div className="space-y-4">
          <BookingForm
            profile={profile}
            services={services.map((service) => ({
              id: service.id,
              name: service.name,
              description: service.description,
              durationMinutes: service.durationMinutes,
              priceCents: service.priceCents,
              professionalIds: service.professionals.map((item) => item.professionalId)
            }))}
            professionals={professionals.map((professional) => ({
              id: professional.id,
              name: professional.name,
              specialties: professional.specialties,
              serviceIds: professional.services.map((item) => item.serviceId)
            }))}
          />
          <ContactBlock
            address={profile.address}
            whatsappUrl={profile.whatsappUrl}
            instagramUrl={profile.instagramUrl}
            className="lg:hidden"
            addressClassName="border border-blue-100 bg-white text-[var(--booking-text)] shadow-lg shadow-blue-950/5"
            linksClassName="mt-2 grid grid-cols-2 gap-2"
          />
        </div>
      </section>
    </main>
  );
}

function ContactBlock({
  address,
  whatsappUrl,
  instagramUrl,
  className,
  addressClassName,
  linksClassName,
  linkClassName
}: {
  address: string;
  whatsappUrl: string;
  instagramUrl: string;
  className: string;
  addressClassName: string;
  linksClassName: string;
  linkClassName?: string;
}) {
  return (
    <div className={className}>
      <p className={`flex items-start gap-3 rounded-[16px] px-3 py-3 text-sm font-medium leading-5 ${addressClassName}`}>
        <MapPin aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
        {address}
      </p>
      <ContactLinks whatsappUrl={whatsappUrl} instagramUrl={instagramUrl} className={linksClassName} linkClassName={linkClassName} />
    </div>
  );
}

function ContactLinks({
  whatsappUrl,
  instagramUrl,
  className,
  linkClassName
}: {
  whatsappUrl: string;
  instagramUrl: string;
  className: string;
  linkClassName?: string;
}) {
  const linkClass = `flex h-11 items-center justify-center gap-2 rounded-[16px] px-3 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 ${linkClassName ?? "bg-[var(--booking-primary-dark)] text-white shadow-lg shadow-blue-950/10 hover:brightness-110 focus-visible:ring-white"}`;

  return (
    <div className={className}>
      <a href={whatsappUrl} target="_blank" rel="noreferrer" className={linkClass}>
        <MessageCircle aria-hidden className="h-4 w-4" />
        WhatsApp
      </a>
      <a href={instagramUrl} target="_blank" rel="noreferrer" className={linkClass}>
        <Camera aria-hidden className="h-4 w-4" />
        Instagram
      </a>
    </div>
  );
}
