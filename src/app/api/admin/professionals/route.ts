import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

const professionalSchema = z.object({
  name: z.string().trim().min(2).max(80),
  phone: z.string().min(8).max(24),
  specialties: z.string().trim().min(2).max(240),
  photoUrl: z.string().max(3000000).nullable().optional(),
  commissionPercent: z.number().int().min(0).max(100).optional(),
  active: z.boolean().optional(),
  serviceIds: z.array(z.string().min(1).max(128)).optional()
});

export async function GET() {
  await requireAdmin();
  return NextResponse.json(
    await prisma.professional.findMany({
      include: { services: { include: { service: true } } },
      orderBy: { name: "asc" }
    })
  );
}

export async function POST(request: Request) {
  await requireAdmin();
  const input = professionalSchema.safeParse(await request.json());
  if (!input.success) {
    return NextResponse.json({ error: "Dados invalidos." }, { status: 400 });
  }

  const serviceIds = await getValidServiceIds(input.data.serviceIds ?? []);
  const professional = await prisma.$transaction(async (tx) => {
    const created = await tx.professional.create({
      data: {
        name: input.data.name,
        phone: normalizePhone(input.data.phone),
        specialties: input.data.specialties,
        photoUrl: input.data.photoUrl ?? null,
        commissionPercent: input.data.commissionPercent ?? 0,
        active: Boolean(input.data.active)
      }
    });

    if (serviceIds.length > 0) {
      await tx.professionalService.createMany({
        data: serviceIds.map((serviceId) => ({ professionalId: created.id, serviceId })),
        skipDuplicates: true
      });
    }

    return created;
  });
  revalidatePath("/admin");
  revalidatePath("/admin/profissionais");
  revalidatePath("/agendar");
  return NextResponse.json(professional);
}

async function getValidServiceIds(serviceIds: string[]) {
  const ids = Array.from(new Set(serviceIds.map((serviceId) => serviceId.trim()).filter(Boolean)));
  if (ids.length === 0) return [];
  const services = await prisma.service.findMany({
    where: { id: { in: ids } },
    select: { id: true }
  });
  return services.map((service) => service.id);
}

function normalizePhone(value: string) {
  return value.replace(/[^\d+]/g, "");
}
