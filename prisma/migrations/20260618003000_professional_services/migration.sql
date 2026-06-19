CREATE TABLE "ProfessionalService" (
  "id" TEXT NOT NULL,
  "professionalId" TEXT NOT NULL,
  "serviceId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ProfessionalService_pkey" PRIMARY KEY ("id")
);

INSERT INTO "ProfessionalService" ("id", "professionalId", "serviceId")
SELECT
  CONCAT('ps_', MD5("Professional"."id" || ':' || "Service"."id")),
  "Professional"."id",
  "Service"."id"
FROM "Professional"
CROSS JOIN "Service"
ON CONFLICT DO NOTHING;

CREATE UNIQUE INDEX "ProfessionalService_professionalId_serviceId_key"
  ON "ProfessionalService"("professionalId", "serviceId");

CREATE INDEX "ProfessionalService_serviceId_idx"
  ON "ProfessionalService"("serviceId");

ALTER TABLE "ProfessionalService"
  ADD CONSTRAINT "ProfessionalService_professionalId_fkey"
  FOREIGN KEY ("professionalId") REFERENCES "Professional"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProfessionalService"
  ADD CONSTRAINT "ProfessionalService_serviceId_fkey"
  FOREIGN KEY ("serviceId") REFERENCES "Service"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
