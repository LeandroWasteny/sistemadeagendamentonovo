import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarDays, Clock, Home, LogOut, MessageCircle, Scissors, Users } from "lucide-react";
import { destroySession } from "@/lib/auth/session";

const links = [
  { href: "/admin", label: "Dashboard", icon: Home },
  { href: "/admin/servicos", label: "Servicos", icon: Scissors },
  { href: "/admin/profissionais", label: "Profissionais", icon: Users },
  { href: "/admin/horarios", label: "Horarios", icon: Clock },
  { href: "/admin/agendamentos", label: "Agendamentos", icon: CalendarDays },
  { href: "/admin/whatsapp", label: "WhatsApp", icon: MessageCircle }
];

export function AdminNav() {
  async function logout() {
    "use server";
    await destroySession();
    redirect("/admin/login");
  }

  return (
    <aside className="border-b border-blue-100 bg-white/95 shadow-sm shadow-blue-950/5 backdrop-blur md:min-h-screen md:w-72 md:border-b-0 md:border-r">
      <div className="px-5 py-5">
        <Link href="/admin" className="flex items-center gap-3">
          <Image src="/brand/logo-icon.png" alt="Agenda Pra Já" width={44} height={44} className="h-11 w-11 rounded-[14px] object-contain" />
          <div>
            <p className="text-xs font-semibold uppercase text-[#0F5EF7]">Painel admin</p>
            <Image src="/brand/wordmark.png" alt="Agenda Pra Já" width={146} height={56} className="mt-1 h-auto w-32 object-contain" />
          </div>
        </Link>
      </div>
      <nav className="flex gap-1 overflow-x-auto px-3 pb-3 md:block md:space-y-1">
        {links.map((link) => {
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              className="flex items-center gap-2 rounded-[12px] px-3 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-blue-50 hover:text-[#0F5EF7]"
            >
              <Icon className="h-4 w-4" />
              {link.label}
            </Link>
          );
        })}
      </nav>
      <form action={logout} className="px-3 pb-4">
        <button className="flex w-full items-center gap-2 rounded-[12px] px-3 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-blue-50 hover:text-[#0F5EF7]">
          <LogOut className="h-4 w-4" />
          Sair
        </button>
      </form>
    </aside>
  );
}
