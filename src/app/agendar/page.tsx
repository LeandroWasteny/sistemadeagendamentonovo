import Image from "next/image";
import { ArrowRight, BadgeCheck, BellRing, CalendarClock } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { BookingForm } from "./booking-form";

export const dynamic = "force-dynamic";

export default async function BookingPage() {
  const [services, professionals] = await Promise.all([
    prisma.service.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    prisma.professional.findMany({ where: { active: true }, orderBy: { name: "asc" } })
  ]);

  return (
    <main className="min-h-screen overflow-hidden bg-[linear-gradient(135deg,#ffffff_0%,#f4f9ff_45%,#eefcf5_100%)] px-4 py-6 text-[#082F8B] md:py-8">
      <section className="mx-auto grid max-w-7xl gap-6 lg:min-h-[calc(100vh-4rem)] lg:grid-cols-[0.92fr_1.08fr] lg:items-center">
        <div className="relative flex flex-col justify-center py-4">
          <div className="mb-8 flex items-center gap-3">
            <Image
              src="/brand/logo-icon.png"
              alt="Agenda Pra Já"
              width={54}
              height={54}
              className="h-12 w-12 rounded-[16px] object-contain"
              priority
            />
            <Image
              src="/brand/wordmark.png"
              alt="Agenda Pra Já"
              width={214}
              height={82}
              className="h-auto w-44 object-contain md:w-52"
              priority
            />
          </div>

          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-blue-100 bg-white px-3 py-1 text-sm font-semibold text-[#0F5EF7] shadow-sm">
            <CalendarClock className="h-4 w-4" />
            Agendamento online instantaneo
          </div>

          <h1 className="font-display mt-5 max-w-2xl text-4xl font-semibold leading-tight text-[#082F8B] md:text-5xl">
            Reserve seu horario em poucos cliques.
          </h1>
          <p className="mt-4 max-w-xl text-base leading-7 text-slate-600">
            Escolha o servico, a profissional e receba a confirmacao no WhatsApp com uma experiencia rapida e organizada.
          </p>

          <div className="mt-7 grid max-w-xl gap-3 sm:grid-cols-3">
            {[
              { label: "Escolha", icon: ArrowRight },
              { label: "Confirme", icon: BadgeCheck },
              { label: "Receba aviso", icon: BellRing }
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="flex items-center gap-2 rounded-[16px] border border-blue-100 bg-white/85 px-3 py-3 shadow-sm">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] bg-blue-50 text-[#0F5EF7]">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="text-sm font-semibold">{item.label}</span>
                </div>
              );
            })}
          </div>

          <div className="mt-8 hidden max-w-lg items-center gap-4 rounded-[18px] border border-emerald-100 bg-white/80 p-4 shadow-sm md:flex">
            <Image src="/brand/logo-icon.png" alt="" width={76} height={76} className="h-16 w-16 rounded-[18px] object-contain" />
            <div>
              <p className="text-sm font-semibold text-[#22C55E]">Confirmacao automatica</p>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                Cliente e profissional ficam alinhados pelo WhatsApp assim que o agendamento e criado.
              </p>
            </div>
          </div>
        </div>

        <BookingForm
          services={services.map((service) => ({
            id: service.id,
            name: service.name,
            durationMinutes: service.durationMinutes,
            priceCents: service.priceCents
          }))}
          professionals={professionals.map((professional) => ({
            id: professional.id,
            name: professional.name,
            specialties: professional.specialties
          }))}
        />
      </section>
    </main>
  );
}
