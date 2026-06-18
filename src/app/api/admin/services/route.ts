import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export async function GET() {
  await requireAdmin();
  return NextResponse.json(
    await prisma.service.findMany({
      include: { professionals: { include: { professional: true } } },
      orderBy: { name: "asc" }
    })
  );
}

export async function POST(request: Request) {
  await requireAdmin();
  const data = await request.json();
  const service = await prisma.service.create({
    data: {
      name: data.name,
      description: data.description,
      durationMinutes: Number(data.durationMinutes),
      priceCents: Number(data.priceCents),
      active: Boolean(data.active)
    }
  });
  revalidatePath("/admin");
  revalidatePath("/admin/servicos");
  revalidatePath("/agendar");
  return NextResponse.json(service);
}
