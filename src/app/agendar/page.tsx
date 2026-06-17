import { prisma } from "@/lib/prisma";
import { BookingForm } from "./booking-form";

export const dynamic = "force-dynamic";

export default async function BookingPage() {
  const [services, professionals] = await Promise.all([
    prisma.service.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    prisma.professional.findMany({ where: { active: true }, orderBy: { name: "asc" } })
  ]);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#e0f2fe,transparent_34%),linear-gradient(135deg,#fafafa,#eef2ff)] px-4 py-8">
      <section className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[0.85fr_1.15fr]">
        <div className="flex flex-col justify-center">
          <p className="text-sm font-medium text-zinc-500">Agendamento online</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-normal text-zinc-950 md:text-5xl">
            Escolha servico, profissional e horario em poucos cliques.
          </h1>
          <p className="mt-4 max-w-xl text-base leading-7 text-zinc-600">
            Depois da confirmacao, o cliente e a profissional recebem uma notificacao por WhatsApp.
          </p>
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
