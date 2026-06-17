import { NextResponse } from "next/server";
import { calculateAvailableSlots } from "@/lib/availability";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const serviceId = searchParams.get("serviceId");
  const professionalId = searchParams.get("professionalId");
  const date = searchParams.get("date");

  if (!serviceId || !professionalId || !date) {
    return NextResponse.json({ error: "Parametros invalidos." }, { status: 400 });
  }

  const service = await prisma.service.findUnique({ where: { id: serviceId } });
  if (!service) return NextResponse.json({ error: "Servico nao encontrado." }, { status: 404 });

  const [schedules, appointments] = await Promise.all([
    prisma.professionalSchedule.findMany({ where: { professionalId, active: true } }),
    prisma.appointment.findMany({
      where: {
        professionalId,
        startsAt: {
          gte: new Date(`${date}T00:00:00`),
          lte: new Date(`${date}T23:59:59`)
        }
      }
    })
  ]);

  const slots = calculateAvailableSlots({
    date,
    serviceDurationMinutes: service.durationMinutes,
    schedules,
    appointments
  });

  return NextResponse.json({
    slots: slots.map((slot) => ({
      time: slot.time,
      startsAt: slot.startsAt.toISOString()
    }))
  });
}

