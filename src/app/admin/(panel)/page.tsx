import Link from "next/link";
import { BarChart3, CalendarCheck, Clock, Scissors, TrendingUp, Users } from "lucide-react";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const [services, professionals, pending, confirmed] = await Promise.all([
    prisma.service.count(),
    prisma.professional.count(),
    prisma.appointment.count({ where: { status: "PENDING" } }),
    prisma.appointment.count({ where: { status: "CONFIRMED" } })
  ]);

  const cards = [
    { label: "Servicos", value: services, href: "/admin/servicos", icon: Scissors, tone: "blue" },
    { label: "Profissionais", value: professionals, href: "/admin/profissionais", icon: Users, tone: "sky" },
    { label: "Pendentes", value: pending, href: "/admin/agendamentos", icon: Clock, tone: "amber" },
    { label: "Confirmados", value: confirmed, href: "/admin/agendamentos", icon: CalendarCheck, tone: "green" },
    { label: "Relatorios", value: "", href: "/admin/relatorios", icon: BarChart3, tone: "blue" }
  ];

  return (
    <section>
      <div className="rounded-[24px] border border-white bg-white/90 p-5 shadow-xl shadow-blue-950/5 md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-[#0F5EF7]">Agenda Pra Já</p>
            <h1 className="font-display mt-1 text-2xl font-semibold text-[#082F8B]">Dashboard</h1>
            <p className="mt-1 text-sm text-slate-500">Resumo rapido da operacao.</p>
          </div>
          <div className="flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-2 text-sm font-semibold text-[#22C55E]">
            <TrendingUp className="h-4 w-4" />
            Operacao ativa
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-5">
        {cards.map((card) => {
          const Icon = card.icon;
          const toneClass =
            card.tone === "green"
              ? "bg-emerald-50 text-[#22C55E]"
              : card.tone === "amber"
                ? "bg-amber-50 text-[#FBBF24]"
                : card.tone === "sky"
                  ? "bg-sky-50 text-[#38BDF8]"
                  : "bg-blue-50 text-[#0F5EF7]";
          return (
            <Link
              key={card.label}
              href={card.href}
              className="rounded-[18px] border border-white bg-white p-5 shadow-lg shadow-blue-950/5 transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-blue-950/10"
            >
              <span className={`flex h-11 w-11 items-center justify-center rounded-[14px] ${toneClass}`}>
                <Icon className="h-5 w-5" />
              </span>
              <p className="mt-4 text-3xl font-semibold text-[#082F8B]">{card.value}</p>
              <p className="text-sm font-medium text-slate-500">{card.label}</p>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
