import type { Metadata } from "next";
import { ThemeProvider } from "@/components/theme/theme-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Agenda Pra Já",
  description: "Agendamento online rapido com painel administrativo e notificacoes por WhatsApp",
  icons: {
    icon: "/brand/favicon.svg",
    apple: "/brand/logo-icon.png"
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
