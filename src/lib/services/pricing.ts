export type ServicePricing = {
  priceCents: number;
  promoActive: boolean;
  promoDiscountPercent?: number | null;
  promoPriceCents?: number | null;
};

export function getPromotionPercent(service: ServicePricing) {
  if (!service.promoActive) return 0;

  const directPercent = normalizePercent(service.promoDiscountPercent);
  if (directPercent > 0) return directPercent;

  if (service.promoPriceCents !== null && service.promoPriceCents !== undefined && service.promoPriceCents < service.priceCents) {
    return normalizePercent(Math.round(100 - (service.promoPriceCents / service.priceCents) * 100));
  }

  return 0;
}

export function isPromotionActive(service: ServicePricing) {
  return getPromotionPercent(service) > 0;
}

export function getEffectivePriceCents(service: ServicePricing) {
  const percent = getPromotionPercent(service);
  if (percent > 0) {
    return Math.max(0, Math.round((service.priceCents * (100 - percent)) / 100));
  }

  if (
    service.promoActive &&
    service.promoPriceCents !== null &&
    service.promoPriceCents !== undefined &&
    service.promoPriceCents >= 0 &&
    service.promoPriceCents < service.priceCents
  ) {
    return service.promoPriceCents;
  }

  return service.priceCents;
}

function normalizePercent(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return Math.min(95, Math.max(0, Math.round(Number(value))));
}
