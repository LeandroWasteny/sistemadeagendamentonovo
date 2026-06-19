ALTER TABLE "Service"
  ADD COLUMN "promoPriceCents" INTEGER,
  ADD COLUMN "promoActive" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX "Service_active_sortOrder_idx"
  ON "Service"("active", "sortOrder");
