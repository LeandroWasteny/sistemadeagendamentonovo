import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({
  connectionString:
    process.env.DATABASE_URL ??
    "postgresql://agendamento:agendamento@localhost:5432/agendamento?schema=public"
});

const prisma = new PrismaClient({ adapter });

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL ?? "admin@agendamento.local";
  const adminPassword = process.env.ADMIN_PASSWORD ?? "admin123";

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      name: "Administrador",
      email: adminEmail,
      passwordHash: await bcrypt.hash(adminPassword, 10)
    }
  });

  await prisma.businessProfile.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      businessName: "Studio Agenda",
      tagline: "Escolha seu horario",
      logoUrl: "/brand/logo-icon.png",
      address: "Atendimento com horario marcado",
      whatsappUrl: "https://wa.me/5585999990000",
      instagramUrl: "https://instagram.com/",
      primaryColor: "#0F5EF7",
      primaryDark: "#082F8B",
      accentColor: "#22C55E",
      accentSoft: "#EAFBF1",
      backgroundColor: "#F6F9FF",
      surfaceColor: "#FFFFFF",
      textColor: "#082F8B",
      mutedColor: "#64748B"
    }
  });

  const corte = await prisma.service.upsert({
    where: { id: "seed-service-corte" },
    update: {},
    create: {
      id: "seed-service-corte",
      name: "Corte feminino",
      description: "Corte personalizado com finalizacao.",
      durationMinutes: 60,
      priceCents: 9000,
      sortOrder: 1
    }
  });

  const escova = await prisma.service.upsert({
    where: { id: "seed-service-escova" },
    update: {},
    create: {
      id: "seed-service-escova",
      name: "Escova",
      description: "Escova modelada para eventos e rotina.",
      durationMinutes: 45,
      priceCents: 6000,
      promoActive: true,
      promoDiscountPercent: 15,
      sortOrder: 2
    }
  });

  await prisma.coupon.upsert({
    where: { code: "BEMVINDO10" },
    update: {},
    create: {
      code: "BEMVINDO10",
      name: "Boas-vindas",
      discountType: "PERCENT",
      discountValue: 10,
      minAmountCents: 5000,
      usageLimit: 100,
      active: true
    }
  });

  const camila = await prisma.professional.upsert({
    where: { id: "seed-professional-camila" },
    update: {},
    create: {
      id: "seed-professional-camila",
      name: "Camila Rocha",
      phone: "85988887777",
      specialties: "Cortes, escovas e finalizacao"
    }
  });

  const bianca = await prisma.professional.upsert({
    where: { id: "seed-professional-bianca" },
    update: {},
    create: {
      id: "seed-professional-bianca",
      name: "Bianca Lima",
      phone: "85977776666",
      specialties: "Escovas, finalizacao e tratamentos"
    }
  });

  await prisma.professionalService.createMany({
    data: [
      { professionalId: camila.id, serviceId: corte.id },
      { professionalId: camila.id, serviceId: escova.id },
      { professionalId: bianca.id, serviceId: escova.id }
    ],
    skipDuplicates: true
  });

  await prisma.professionalSchedule.createMany({
    data: [1, 2, 3, 4, 5].map((dayOfWeek) => ({
      professionalId: camila.id,
      dayOfWeek,
      startTime: "09:00",
      endTime: "18:00",
      intervalMinutes: corte.durationMinutes
    })),
    skipDuplicates: true
  });

  await prisma.professionalSchedule.createMany({
    data: [2, 3, 4, 5, 6].map((dayOfWeek) => ({
      professionalId: bianca.id,
      dayOfWeek,
      startTime: "10:00",
      endTime: "17:00",
      intervalMinutes: escova.durationMinutes
    })),
    skipDuplicates: true
  });
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
