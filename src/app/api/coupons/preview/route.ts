import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { calculateCouponDiscountCents, getEffectivePriceCents, normalizeCouponCode } from "@/lib/services/pricing";
import { formatCurrency } from "@/lib/utils";

const previewSchema = z.object({
  code: z.string().min(2).max(40),
  serviceId: z.string().min(1)
});

export async function POST(request: Request) {
  const input = previewSchema.safeParse(await request.json());
  if (!input.success) {
    return NextResponse.json({ error: "Informe o cupom e o servico." }, { status: 400 });
  }

  const [service, coupon] = await Promise.all([
    prisma.service.findFirst({ where: { id: input.data.serviceId, active: true } }),
    prisma.coupon.findUnique({ where: { code: normalizeCouponCode(input.data.code) } })
  ]);

  if (!service) {
    return NextResponse.json({ error: "Servico indisponivel." }, { status: 404 });
  }

  const basePriceCents = getEffectivePriceCents(service);
  if (!coupon || !isCouponUsable(coupon, basePriceCents)) {
    return NextResponse.json({ error: "Cupom invalido, expirado ou fora das regras." }, { status: 400 });
  }

  const discountCents = calculateCouponDiscountCents(basePriceCents, coupon);
  const finalPriceCents = Math.max(0, basePriceCents - discountCents);

  return NextResponse.json({
    code: coupon.code,
    name: coupon.name,
    discount: formatCurrency(discountCents),
    finalPrice: formatCurrency(finalPriceCents),
    discountCents,
    finalPriceCents
  });
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
