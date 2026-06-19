CREATE TYPE "NotificationTarget" AS ENUM ('CLIENT', 'PROFESSIONAL');

CREATE TYPE "NotificationStatus" AS ENUM ('SENT', 'FAILED');

CREATE TABLE "NotificationLog" (
  "id" TEXT NOT NULL,
  "appointmentId" TEXT NOT NULL,
  "target" "NotificationTarget" NOT NULL,
  "status" "NotificationStatus" NOT NULL,
  "channel" TEXT NOT NULL DEFAULT 'WHATSAPP',
  "destination" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "providerMessageId" TEXT,
  "error" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "NotificationLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "NotificationLog_appointmentId_createdAt_idx" ON "NotificationLog"("appointmentId", "createdAt");

ALTER TABLE "NotificationLog" ADD CONSTRAINT "NotificationLog_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

