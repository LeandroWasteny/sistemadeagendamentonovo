import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

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
  const data = await request.json();
  const serviceIds: string[] = Array.isArray(data.serviceIds)
    ? data.serviceIds.map((serviceId: unknown) => String(serviceId))
    : [];
  const professional = await prisma.$transaction(async (tx) => {
    const created = await tx.professional.create({
      data: {
        name: data.name,
        phone: data.phone,
        specialties: data.specialties,
        active: Boolean(data.active)
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
  revalidatePath("/admin/profissionais");
  revalidatePath("/agendar");
  return NextResponse.json(professional);
}
