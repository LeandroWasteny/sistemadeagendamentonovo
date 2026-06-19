import { prisma } from "@/lib/prisma";

export type PublicBookingProfile = {
  businessName: string;
  tagline: string;
  logoUrl: string;
  whatsappUrl: string;
  instagramUrl: string;
  address: string;
  palette: {
    primary: string;
    primaryDark: string;
    accent: string;
    accentSoft: string;
    background: string;
    surface: string;
    text: string;
    muted: string;
  };
};

export const defaultPublicBookingProfile: PublicBookingProfile = {
  businessName: "Studio Agenda",
  tagline: "Escolha seu horario",
  logoUrl: "/brand/logo-icon.png",
  whatsappUrl: "https://wa.me/5585999990000",
  instagramUrl: "https://instagram.com/",
  address: "Atendimento com horario marcado",
  palette: {
    primary: "#0F5EF7",
    primaryDark: "#082F8B",
    accent: "#22C55E",
    accentSoft: "#EAFBF1",
    background: "#F6F9FF",
    surface: "#FFFFFF",
    text: "#082F8B",
    muted: "#64748B"
  }
};

export async function getPublicBookingProfile(): Promise<PublicBookingProfile> {
  const profile = await prisma.businessProfile.findUnique({ where: { id: "default" } });
  if (!profile) return defaultPublicBookingProfile;

  return {
    businessName: profile.businessName,
    tagline: profile.tagline,
    logoUrl: profile.logoUrl,
    whatsappUrl: profile.whatsappUrl,
    instagramUrl: profile.instagramUrl,
    address: profile.address,
    palette: {
      primary: profile.primaryColor,
      primaryDark: profile.primaryDark,
      accent: profile.accentColor,
      accentSoft: profile.accentSoft,
      background: profile.backgroundColor,
      surface: profile.surfaceColor,
      text: profile.textColor,
      muted: profile.mutedColor
    }
  };
}
