import { Camera, MapPin, MessageCircle } from "lucide-react";
import type { CSSProperties } from "react";
import { publicBookingProfile } from "@/lib/booking/public-profile";
import { prisma } from "@/lib/prisma";
import { BookingForm } from "./booking-form";

export const dynamic = "force-dynamic";

export default async function BookingPage() {
  const [services, professionals] = await Promise.all([
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

  const profile = publicBookingProfile;
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
        <aside className="flex rounded-[24px] bg-[var(--booking-primary-dark)] p-3 text-white shadow-2xl shadow-blue-950/15 sm:rounded-[28px] sm:p-4 lg:sticky lg:top-6 lg:h-[calc(100vh-3rem)] lg:min-h-[640px] lg:flex-col">
          <div className="flex items-center gap-3 rounded-[20px] bg-white/95 p-2.5 text-[var(--booking-text)] sm:rounded-[22px] sm:p-3">
            <img
              src={profile.logoUrl}
              alt={profile.businessName}
              width={56}
              height={56}
              className="h-12 w-12 shrink-0 rounded-[16px] object-contain sm:h-14 sm:w-14 sm:rounded-[18px]"
            />
            <div className="min-w-0">
              <h1 className="font-display truncate text-xl font-semibold">{profile.businessName}</h1>
              <p className="text-sm font-medium text-[var(--booking-muted)]">{profile.tagline}</p>
            </div>
          </div>

          <div className="mt-4 hidden space-y-2 lg:block">
            <p className="flex items-start gap-3 rounded-[16px] bg-white/10 px-3 py-3 text-sm font-medium leading-5 text-white/85">
              <MapPin aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
              {profile.address}
            </p>
            {profile.promotions.map((promotion) => (
              <div key={promotion.title} className="rounded-[18px] border border-white/10 bg-white/10 p-3">
                <p className="text-sm font-semibold">{promotion.title}</p>
                <p className="mt-1 text-xs font-medium text-white/75">{promotion.description}</p>
              </div>
            ))}
          </div>
          <ContactLinks
            whatsappUrl={profile.whatsappUrl}
            instagramUrl={profile.instagramUrl}
            className="mt-auto hidden gap-2 lg:grid"
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
          <ContactLinks
            whatsappUrl={profile.whatsappUrl}
            instagramUrl={profile.instagramUrl}
            className="grid grid-cols-2 gap-2 lg:hidden"
          />
        </div>
      </section>
    </main>
  );
}

function ContactLinks({
  whatsappUrl,
  instagramUrl,
  className
}: {
  whatsappUrl: string;
  instagramUrl: string;
  className: string;
}) {
  const linkClass =
    "flex h-11 items-center justify-center gap-2 rounded-[16px] bg-[var(--booking-primary-dark)] px-3 text-sm font-semibold text-white shadow-lg shadow-blue-950/10 transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white";

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
