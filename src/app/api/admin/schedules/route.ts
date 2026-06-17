import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export async function GET() {
  await requireAdmin();
  return NextResponse.json(
    await prisma.professionalSchedule.findMany({
      include: { professional: true },
      orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }]
    })
  );
}

export async function POST(request: Request) {
  await requireAdmin();
  const data = await request.json();
  const schedule = await prisma.professionalSchedule.create({
    data: {
      professionalId: data.professionalId,
      dayOfWeek: Number(data.dayOfWeek),
      startTime: data.startTime,
      endTime: data.endTime,
      intervalMinutes: Number(data.intervalMinutes),
      active: Boolean(data.active)
    }
  });
  return NextResponse.json(schedule);
}

