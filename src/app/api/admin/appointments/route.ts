import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export async function GET() {
  await requireAdmin();
  return NextResponse.json(
    await prisma.appointment.findMany({
      include: { service: true, professional: true },
      orderBy: { startsAt: "desc" }
    })
  );
}

