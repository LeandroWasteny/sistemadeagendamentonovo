export type ServicePricing = {
  priceCents: number;
  promoActive: boolean;
  promoDiscountPercent?: number | null;
  promoPriceCents?: number | null;
  promoStartsAt?: Date | string | null;
  promoEndsAt?: Date | string | null;
};

export type CouponPricing = {
  discountType: "PERCENT" | "FIXED";
  discountValue: number;
  minAmountCents?: number | null;
};

export type AppointmentPricing = {
  priceCents?: number | null;
  finalPriceCents?: number | null;
  discountCents?: number | null;
  service?: ServicePricing;
};

export function getPromotionPercent(service: ServicePricing, at: Date = new Date()) {
  if (!service.promoActive || !isWithinPeriod(service.promoStartsAt, service.promoEndsAt, at)) return 0;

  const directPercent = normalizePercent(service.promoDiscountPercent);
  if (directPercent > 0) return directPercent;

  if (service.promoPriceCents !== null && service.promoPriceCents !== undefined && service.promoPriceCents < service.priceCents) {
    return normalizePercent(Math.round(100 - (service.promoPriceCents / service.priceCents) * 100));
  }

  return 0;
}

export function isPromotionActive(service: ServicePricing, at: Date = new Date()) {
  return getPromotionPercent(service, at) > 0;
}

export function getEffectivePriceCents(service: ServicePricing, at: Date = new Date()) {
  const percent = getPromotionPercent(service, at);
  if (percent > 0) {
    return Math.max(0, Math.round((service.priceCents * (100 - percent)) / 100));
  }

  if (
    service.promoActive &&
    isWithinPeriod(service.promoStartsAt, service.promoEndsAt, at) &&
    service.promoPriceCents !== null &&
    service.promoPriceCents !== undefined &&
    service.promoPriceCents >= 0 &&
    service.promoPriceCents < service.priceCents
  ) {
    return service.promoPriceCents;
  }

  return service.priceCents;
}

export function calculateCouponDiscountCents(basePriceCents: number, coupon: CouponPricing | null | undefined) {
  if (!coupon) return 0;
  if (basePriceCents < (coupon.minAmountCents ?? 0)) return 0;

  if (coupon.discountType === "PERCENT") {
    const percent = Math.min(95, Math.max(0, Math.round(coupon.discountValue)));
    return Math.min(basePriceCents, Math.round((basePriceCents * percent) / 100));
  }

  return Math.min(basePriceCents, Math.max(0, Math.round(coupon.discountValue)));
}

export function getAppointmentFinalPriceCents(appointment: AppointmentPricing) {
  if (appointment.finalPriceCents !== null && appointment.finalPriceCents !== undefined) {
    return appointment.finalPriceCents;
  }
  if (appointment.service) return getEffectivePriceCents(appointment.service);
  return appointment.priceCents ?? 0;
}

export function getAppointmentDiscountCents(appointment: AppointmentPricing) {
  if (appointment.finalPriceCents !== null && appointment.finalPriceCents !== undefined) {
    return Math.max(0, (appointment.priceCents ?? appointment.service?.priceCents ?? appointment.finalPriceCents) - appointment.finalPriceCents);
  }
  if (appointment.discountCents !== null && appointment.discountCents !== undefined) return appointment.discountCents;
  if (appointment.service) return Math.max(0, appointment.service.priceCents - getEffectivePriceCents(appointment.service));
  return 0;
}

export function normalizeCouponCode(value: string) {
  return value.trim().toUpperCase().replace(/\s+/g, "");
}

function normalizePercent(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return Math.min(95, Math.max(0, Math.round(Number(value))));
}

function isWithinPeriod(startsAt: Date | string | null | undefined, endsAt: Date | string | null | undefined, at: Date) {
  const start = toDate(startsAt);
  const end = toDate(endsAt);
  if (start && at < start) return false;
  if (end && at > end) return false;
  return true;
}

function toDate(value: Date | string | null | undefined) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}
