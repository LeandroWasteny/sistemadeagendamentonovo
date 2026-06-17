import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export async function GET() {
  await requireAdmin();
  return NextResponse.json(await prisma.professional.findMany({ orderBy: { name: "asc" } }));
}

export async function POST(request: Request) {
  await requireAdmin();
  const data = await request.json();
  const professional = await prisma.professional.create({
    data: {
      name: data.name,
      phone: data.phone,
      specialties: data.specialties,
      active: Boolean(data.active)
    }
  });
  return NextResponse.json(professional);
}

