CREATE TYPE "CouponDiscountType" AS ENUM ('PERCENT', 'FIXED');

ALTER TABLE "Service"
  ADD COLUMN "promoStartsAt" TIMESTAMP(3),
  ADD COLUMN "promoEndsAt" TIMESTAMP(3);

CREATE TABLE "Coupon" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "discountType" "CouponDiscountType" NOT NULL DEFAULT 'PERCENT',
  "discountValue" INTEGER NOT NULL,
  "minAmountCents" INTEGER NOT NULL DEFAULT 0,
  "usageLimit" INTEGER,
  "usedCount" INTEGER NOT NULL DEFAULT 0,
  "startsAt" TIMESTAMP(3),
  "endsAt" TIMESTAMP(3),
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Coupon_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Coupon_code_key" ON "Coupon"("code");
CREATE INDEX "Coupon_active_startsAt_endsAt_idx" ON "Coupon"("active", "startsAt", "endsAt");

ALTER TABLE "Appointment"
  ADD COLUMN "priceCents" INTEGER,
  ADD COLUMN "discountCents" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "finalPriceCents" INTEGER,
  ADD COLUMN "couponId" TEXT;

CREATE INDEX "Appointment_couponId_idx" ON "Appointment"("couponId");

ALTER TABLE "Appointment"
  ADD CONSTRAINT "Appointment_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "Coupon"("id") ON DELETE SET NULL ON UPDATE CASCADE;
