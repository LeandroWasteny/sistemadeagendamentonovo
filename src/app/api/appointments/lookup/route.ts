import { NextResponse } from "next/server";
import { z } from "zod";
import { getAppointmentLookupCode, normalizeLookupCode } from "@/lib/booking/lookup-code";
import { normalizeBrazilPhone } from "@/lib/notifications/templates";
import { prisma } from "@/lib/prisma";
import { formatCurrency, statusLabel } from "@/lib/utils";

const lookupSchema = z.object({
  clientPhone: z.string().min(8),
  lookupCode: z.string().min(4).max(20)
});

export async function POST(request: Request) {
  const input = lookupSchema.safeParse(await request.json());
  if (!input.success) {
    return NextResponse.json({ error: "Informe WhatsApp e codigo." }, { status: 400 });
  }

  const code = normalizeLookupCode(input.data.lookupCode);
  if (code.length < 4) {
    return NextResponse.json({ error: "Codigo invalido." }, { status: 400 });
  }

  const phone = normalizeBrazilPhone(input.data.clientPhone);
  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - 30);

  const candidates = await prisma.appointment.findMany({
    where: {
      id: { endsWith: code },
      startsAt: { gte: fromDate }
    },
    include: {
      service: true,
      professional: true
    },
    orderBy: { startsAt: "desc" },
    take: 10
  });

  const appointment = candidates.find((item) => normalizeBrazilPhone(item.clientPhone) === phone);
  if (!appointment) {
    return NextResponse.json({ error: "Nenhum agendamento encontrado com esses dados." }, { status: 404 });
  }

  return NextResponse.json({
    appointment: {
      id: appointment.id,
      lookupCode: getAppointmentLookupCode(appointment.id),
      clientName: appointment.clientName,
      status: appointment.status,
      statusLabel: statusLabel(appointment.status),
      serviceName: appointment.service.name,
      professionalName: appointment.professional.name,
      startsAt: appointment.startsAt,
      price: formatCurrency(appointment.service.priceCents)
    }
  });
}
