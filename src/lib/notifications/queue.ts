import { createNotificationLogs } from "@/lib/notifications/logs";
import { buildAppointmentMessages } from "@/lib/notifications/templates";
import { sendAppointmentNotifications } from "@/lib/notifications/whatsapp";

type QueueAppointmentInput = {
  appointment: {
    id: string;
    clientName: string;
    clientPhone: string;
    startsAt: Date;
    status: string;
  };
  service: {
    name: string;
  };
  professional: {
    name: string;
    phone: string;
  };
};

export function queueAppointmentNotification(input: QueueAppointmentInput) {
  setTimeout(() => {
    void notifyAppointment(input).catch((error) => {
      const message = error instanceof Error ? error.message : "Falha desconhecida";
      console.error(`[whatsapp] fila de notificacao falhou: ${message}`);
    });
  }, 0);
}

async function notifyAppointment({ appointment, service, professional }: QueueAppointmentInput) {
  const messages = buildAppointmentMessages({
    clientName: appointment.clientName,
    clientPhone: appointment.clientPhone,
    professionalName: professional.name,
    professionalPhone: professional.phone,
    serviceName: service.name,
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
