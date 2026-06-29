import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { calculateAvailableSlots } from "@/lib/availability";
import { getAppointmentLookupCode } from "@/lib/booking/lookup-code";
import { queueAppointmentNotification } from "@/lib/notifications/queue";
import { prisma } from "@/lib/prisma";
import { calculateCouponDiscountCents, getEffectivePriceCents, normalizeCouponCode } from "@/lib/services/pricing";

const appointmentSchema = z.object({
  serviceId: z.string().min(1),
  professionalId: z.string().min(1),
  startsAt: z.string().min(1),
  clientName: z.string().min(2),
  clientPhone: z.string().min(8),
  couponCode: z.string().optional().nullable(),
  notes: z.string().optional().nullable()
});

export async function POST(request: Request) {
  const input = appointmentSchema.safeParse(await request.json());
  if (!input.success) {
    return NextResponse.json({ error: "Dados invalidos." }, { status: 400 });
  }

  const [service, professional, professionalService] = await Promise.all([
    prisma.service.findFirst({ where: { id: input.data.serviceId, active: true } }),
    prisma.professional.findFirst({ where: { id: input.data.professionalId, active: true } }),
    prisma.professionalService.findUnique({
      where: {
        professionalId_serviceId: {
          professionalId: input.data.professionalId,
          serviceId: input.data.serviceId
        }
      }
    })
  ]);

  if (!service || !professional || !professionalService) {
    return NextResponse.json({ error: "Servico ou profissional indisponivel." }, { status: 404 });
  }

  const startsAt = new Date(input.data.startsAt);
  const endsAt = new Date(startsAt.getTime() + service.durationMinutes * 60000);
  const date = startsAt.toISOString().slice(0, 10);
  const couponCode = normalizeCouponCode(input.data.couponCode ?? "");

  const blockDate = new Date(`${date}T00:00:00.000Z`);
  const [schedules, appointments, scheduleBlocks] = await Promise.all([
    prisma.professionalSchedule.findMany({ where: { professionalId: professional.id, active: true } }),
    prisma.appointment.findMany({
      where: {
        professionalId: professional.id,
        startsAt: {
          gte: new Date(`${date}T00:00:00`),
          lte: new Date(`${date}T23:59:59`)
        }
      }
    }),
    prisma.scheduleBlock.findMany({
      where: {
        active: true,
        date: blockDate,
        OR: [{ professionalId: null }, { professionalId: professional.id }]
      }
    })
  ]);

  const available = calculateAvailableSlots({
    date,
    serviceDurationMinutes: service.durationMinutes,
    schedules,
    appointments,
    scheduleBlocks
  }).some((slot) => slot.startsAt.getTime() === startsAt.getTime());

  if (!available) {
    return NextResponse.json({ error: "Horario indisponivel." }, { status: 409 });
  }

  const priceCents = service.priceCents;
  const serviceFinalPriceCents = getEffectivePriceCents(service);
  const serviceDiscountCents = Math.max(0, priceCents - serviceFinalPriceCents);
  const coupon = couponCode
    ? await prisma.coupon.findUnique({ where: { code: couponCode } })
    : null;

  if (couponCode && !isCouponUsable(coupon, serviceFinalPriceCents)) {
    return NextResponse.json({ error: "Cupom invalido, expirado ou fora das regras de uso." }, { status: 400 });
  }

  const couponDiscountCents = calculateCouponDiscountCents(serviceFinalPriceCents, coupon);
  const discountCents = serviceDiscountCents + couponDiscountCents;
  const finalPriceCents = Math.max(0, serviceFinalPriceCents - couponDiscountCents);

  const appointment = await prisma.$transaction(async (tx) => {
    const created = await tx.appointment.create({
        data: {
          serviceId: service.id,
          professionalId: professional.id,
          couponId: coupon?.id,
          startsAt,
          endsAt,
          clientName: input.data.clientName,
          clientPhone: input.data.clientPhone,
          notes: input.data.notes || null,
          priceCents,
          discountCents,
          finalPriceCents
        }
      });

    if (coupon) {
      await tx.coupon.update({
        where: { id: coupon.id },
        data: { usedCount: { increment: 1 } }
      });
    }

    return created;
  })
    .catch((error) => {
      if (isUniqueConstraintError(error)) {
        return null;
      }
      throw error;
    });

  if (!appointment) {
    return NextResponse.json({ error: "Horario acabou de ser ocupado. Escolha outro horario." }, { status: 409 });
  }

  queueAppointmentNotification({ appointment, service, professional });

  revalidatePath("/admin");
  revalidatePath("/admin/agendamentos");
  revalidatePath("/admin/relatorios");
  revalidatePath("/admin/financeiro");

  return NextResponse.json({
    appointment,
    lookupCode: getAppointmentLookupCode(appointment.id),
    notifications: { status: "QUEUED" }
  });
}

function isUniqueConstraintError(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "P2002";
}

function isCouponUsable(
  coupon: {
    active: boolean;
    startsAt: Date | null;
    endsAt: Date | null;
    usageLimit: number | null;
    usedCount: number;
    minAmountCents: number;
  } | null,
  amountCents: number
) {
  if (!coupon || !coupon.active) return false;
  const now = new Date();
  if (coupon.startsAt && now < coupon.startsAt) return false;
  if (coupon.endsAt && now > coupon.endsAt) return false;
  if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) return false;
  if (amountCents < coupon.minAmountCents) return false;
  return true;
}
