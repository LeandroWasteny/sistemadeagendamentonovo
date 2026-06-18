export function getAppointmentLookupCode(appointmentId: string) {
  return appointmentId.replace(/[^a-zA-Z0-9]/g, "").slice(-8).toUpperCase();
}

export function normalizeLookupCode(code: string) {
  return code.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
}
