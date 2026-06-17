import Link from "next/link";
import { CalendarCheck, Clock, Scissors, Users } from "lucide-react";
import { prisma } from "@/lib/prisma";

export default async function AdminDashboard() {
  const [services, professionals, pending, confirmed] = await Promise.all([
    prisma.service.count(),
    prisma.professional.count(),
    prisma.appointment.count({ where: { status: "PENDING" } }),
    prisma.appointment.count({ where: { status: "CONFIRMED" } })
  ]);

  const cards = [
    { label: "Servicos", value: services, href: "/admin/servicos", icon: Scissors },
    { label: "Profissionais", value: professionals, href: "/admin/profissionais", icon: Users },
    { label: "Pendentes", value: pending, href: "/admin/agendamentos", icon: Clock },
    { label: "Confirmados", value: confirmed, href: "/admin/agendamentos", icon: CalendarCheck }
  ];

  return (
    <section>
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <p className="mt-1 text-sm text-zinc-500">Resumo rapido da operacao.</p>
      <div className="mt-6 grid gap-4 md:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Link key={card.label} href={card.href} className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
              <Icon className="h-5 w-5 text-zinc-500" />
              <p className="mt-4 text-3xl font-semibold">{card.value}</p>
              <p className="text-sm text-zinc-500">{card.label}</p>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

