CREATE UNIQUE INDEX "Appointment_professionalId_startsAt_active_key"
ON "Appointment"("professionalId", "startsAt")
WHERE "status" <> 'CANCELLED';

