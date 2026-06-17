import Link from "next/link";
import { CalendarDays, Clock, Home, MessageCircle, Scissors, Users } from "lucide-react";

const links = [
  { href: "/admin", label: "Dashboard", icon: Home },
  { href: "/admin/servicos", label: "Servicos", icon: Scissors },
  { href: "/admin/profissionais", label: "Profissionais", icon: Users },
  { href: "/admin/horarios", label: "Horarios", icon: Clock },
  { href: "/admin/agendamentos", label: "Agendamentos", icon: CalendarDays },
  { href: "/admin/whatsapp", label: "WhatsApp", icon: MessageCircle }
];

export function AdminNav() {
  return (
    <aside className="border-b border-zinc-200 bg-white md:min-h-screen md:w-64 md:border-b-0 md:border-r">
      <div className="px-5 py-4">
        <p className="text-sm text-zinc-500">Sistema</p>
        <h1 className="text-lg font-semibold">Agendamento</h1>
      </div>
      <nav className="flex gap-1 overflow-x-auto px-3 pb-3 md:block">
        {links.map((link) => {
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-100"
            >
              <Icon className="h-4 w-4" />
              {link.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
