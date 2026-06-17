import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export async function GET() {
  await requireAdmin();
  return NextResponse.json(await prisma.service.findMany({ orderBy: { name: "asc" } }));
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
  return NextResponse.json(service);
}

