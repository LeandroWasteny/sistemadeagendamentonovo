import type { CSSProperties } from "react";
import { publicBookingProfile } from "@/lib/booking/public-profile";
import { AppointmentLookup } from "./appointment-lookup";

export const dynamic = "force-dynamic";

export default function AppointmentLookupPage() {
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
      <section className="mx-auto grid max-w-4xl gap-4">
        <div className="flex items-center gap-3 rounded-[24px] bg-[var(--booking-primary-dark)] p-3 text-white shadow-2xl shadow-blue-950/15">
          <div className="flex min-w-0 flex-1 items-center gap-3 rounded-[20px] bg-white/95 p-2.5 text-[var(--booking-text)]">
            <img
              src={profile.logoUrl}
              alt={profile.businessName}
              width={56}
              height={56}
              className="h-12 w-12 shrink-0 rounded-[16px] object-contain"
            />
            <div className="min-w-0">
              <h1 className="font-display truncate text-xl font-semibold">{profile.businessName}</h1>
              <p className="text-sm font-medium text-[var(--booking-muted)]">{profile.tagline}</p>
            </div>
          </div>
        </div>

        <AppointmentLookup />
      </section>
    </main>
  );
}
