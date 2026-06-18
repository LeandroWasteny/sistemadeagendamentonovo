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
  promotions: Array<{
    title: string;
    description: string;
  }>;
};

export const publicBookingProfile: PublicBookingProfile = {
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
  },
  promotions: [
    {
      title: "Agenda da semana",
      description: "Horarios limitados"
    },
    {
      title: "Confirmacao no WhatsApp",
      description: "Voce recebe o resumo"
    }
  ]
};
