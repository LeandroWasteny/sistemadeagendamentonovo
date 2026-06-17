import { NextResponse } from "next/server";
import { z } from "zod";
import { calculateAvailableSlots } from "@/lib/availability";
import { createNotificationLogs } from "@/lib/notifications/logs";
import { buildAppointmentMessages } from "@/lib/notifications/templates";
import { sendAppointmentNotifications } from "@/lib/notifications/whatsapp";
import { prisma } from "@/lib/prisma";

const appointmentSchema = z.object({
  serviceId: z.string().min(1),
  professionalId: z.string().min(1),
  startsAt: z.string().min(1),
  clientName: z.string().min(2),
  clientPhone: z.string().min(8),
  notes: z.string().optional().nullable()
});

export async function POST(request: Request) {
  const input = appointmentSchema.safeParse(await request.json());
  if (!input.success) {
    return NextResponse.json({ error: "Dados invalidos." }, { status: 400 });
  }

  const [service, professional] = await Promise.all([
    prisma.service.findUnique({ where: { id: input.data.serviceId } }),
    prisma.professional.findUnique({ where: { id: input.data.professionalId } })
  ]);

  if (!service || !professional) {
    return NextResponse.json({ error: "Servico ou profissional indisponivel." }, { status: 404 });
  }

  const startsAt = new Date(input.data.startsAt);
  const endsAt = new Date(startsAt.getTime() + service.durationMinutes * 60000);
  const date = startsAt.toISOString().slice(0, 10);

  const [schedules, appointments] = await Promise.all([
    prisma.professionalSchedule.findMany({ where: { professionalId: professional.id, active: true } }),
    prisma.appointment.findMany({
      where: {
        professionalId: professional.id,
        startsAt: {
          gte: new Date(`${date}T00:00:00`),
          lte: new Date(`${date}T23:59:59`)
        }
      }
    })
  ]);

  const available = calculateAvailableSlots({
    date,
    serviceDurationMinutes: service.durationMinutes,
    schedules,
    appointments
  }).some((slot) => slot.startsAt.getTime() === startsAt.getTime());

  if (!available) {
    return NextResponse.json({ error: "Horario indisponivel." }, { status: 409 });
  }

  const appointment = await prisma.appointment.create({
    data: {
      serviceId: service.id,
      professionalId: professional.id,
      startsAt,
      endsAt,
      clientName: input.data.clientName,
      clientPhone: input.data.clientPhone,
      notes: input.data.notes || null
    }
  });

  const messages = buildAppointmentMessages({
    clientName: appointment.clientName,
    clientPhone: appointment.clientPhone,
    professionalName: professional.name,
    professionalPhone: professional.phone,
    serviceName: service.name,
    startsAt: appointment.startsAt,
    status: appointment.status
  });
  const notifications = await sendAppointmentNotifications(messages);
  await createNotificationLogs({
    appointmentId: appointment.id,
    messages,
    results: notifications
  });

  return NextResponse.json({ appointment, notifications });
}
