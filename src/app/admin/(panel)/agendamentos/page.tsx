import { revalidatePath } from "next/cache";
import { Button } from "@/components/ui/button";
import { createNotificationLogs } from "@/lib/notifications/logs";
import { buildAppointmentMessages } from "@/lib/notifications/templates";
import { sendAppointmentNotifications } from "@/lib/notifications/whatsapp";
import { prisma } from "@/lib/prisma";
import { statusLabel } from "@/lib/utils";

export const dynamic = "force-dynamic";

async function updateAppointmentStatus(formData: FormData) {
  "use server";
  const appointment = await prisma.appointment.update({
    where: { id: String(formData.get("id")) },
    data: { status: String(formData.get("status")) as "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED" },
    include: { service: true, professional: true }
  });

  await notifyAppointment(appointment);

  revalidatePath("/admin/agendamentos");
  revalidatePath("/admin");
  revalidatePath("/admin/relatorios");
}

async function resendAppointmentNotifications(formData: FormData) {
  "use server";
  const appointment = await prisma.appointment.findUnique({
    where: { id: String(formData.get("id")) },
    include: { service: true, professional: true }
  });

  if (appointment) {
    await notifyAppointment(appointment);
  }

  revalidatePath("/admin/agendamentos");
  revalidatePath("/admin/relatorios");
}

async function notifyAppointment(appointment: {
  id: string;
  clientName: string;
  clientPhone: string;
  startsAt: Date;
  status: string;
  service: { name: string };
  professional: { name: string; phone: string };
}) {
  const messages = buildAppointmentMessages({
    clientName: appointment.clientName,
    clientPhone: appointment.clientPhone,
    professionalName: appointment.professional.name,
    professionalPhone: appointment.professional.phone,
    serviceName: appointment.service.name,
    startsAt: appointment.startsAt,
    status: appointment.status
  });
  const results = await sendAppointmentNotifications(messages);
  await createNotificationLogs({
    appointmentId: appointment.id,
    messages,
    results
  });
}

export default async function AppointmentsPage() {
  const appointments = await prisma.appointment.findMany({
    include: {
      service: true,
      professional: true,
      notifications: {
        orderBy: { createdAt: "desc" },
        take: 4
      }
    },
    orderBy: { startsAt: "desc" }
  });

  return (
    <section>
      <div className="mb-6 rounded-[20px] border border-white bg-white/95 p-5 shadow-xl shadow-blue-950/5">
        <p className="text-sm font-semibold text-[#0F5EF7]">Agenda</p>
        <h1 className="font-display mt-1 text-2xl font-semibold text-[#082F8B]">Agendamentos</h1>
        <p className="mt-1 text-sm text-slate-500">Confirme, cancele ou conclua atendimentos.</p>
      </div>
      <div className="rounded-[20px] border border-white bg-white/95 shadow-xl shadow-blue-950/5">
        <div className="divide-y divide-blue-50">
          {appointments.map((appointment) => (
            <div key={appointment.id} className="grid gap-4 p-5 lg:grid-cols-[1fr_auto] lg:items-center">
              <div>
                <p className="font-semibold text-[#082F8B]">{appointment.clientName} - {appointment.service.name}</p>
                <p className="text-sm text-slate-500">
                  {appointment.professional.name} em {new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(appointment.startsAt)}
                </p>
                <p className="mt-1 text-sm text-slate-500">WhatsApp: {appointment.clientPhone}</p>
                <p className="mt-2 inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-[#0F5EF7]">Status: {statusLabel(appointment.status)}</p>
                {appointment.notes && <p className="mt-2 text-sm text-slate-600">{appointment.notes}</p>}
                <div className="mt-3 space-y-1">
                  {appointment.notifications.length === 0 ? (
                    <p className="text-xs text-slate-400">Nenhuma tentativa de notificacao registrada.</p>
                  ) : (
                    appointment.notifications.map((notification) => (
                      <p key={notification.id} className="text-xs text-slate-500">
                        {notification.target === "CLIENT" ? "Cliente" : "Profissional"}: {notification.status === "SENT" ? "enviado" : "falhou"}
                        {notification.error ? ` - ${notification.error}` : ""}
                      </p>
                    ))
                  )}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {["CONFIRMED", "CANCELLED", "COMPLETED"].map((status) => (
                  <form key={status} action={updateAppointmentStatus}>
                    <input type="hidden" name="id" value={appointment.id} />
                    <input type="hidden" name="status" value={status} />
                    <Button variant={status === "CANCELLED" ? "danger" : "secondary"}>
                      {statusLabel(status)}
                    </Button>
                  </form>
                ))}
                <form action={resendAppointmentNotifications}>
                  <input type="hidden" name="id" value={appointment.id} />
                  <Button variant="secondary">Reenviar WhatsApp</Button>
                </form>
              </div>
            </div>
          ))}
          {appointments.length === 0 && <p className="p-5 text-sm text-slate-500">Nenhum agendamento cadastrado.</p>}
        </div>
      </div>
    </section>
  );
}
