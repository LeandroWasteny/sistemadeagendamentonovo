import { prisma } from "@/lib/prisma";
import type { WhatsappMessage } from "./templates";
import type { AppointmentNotificationResult } from "./whatsapp";

type AppointmentMessages = {
  client: WhatsappMessage;
  professional: WhatsappMessage;
};

export async function createNotificationLogs({
  appointmentId,
  messages,
  results
}: {
  appointmentId: string;
  messages: AppointmentMessages;
  results: AppointmentNotificationResult[];
}) {
  const messageByTarget = {
    client: messages.client,
    professional: messages.professional
  };

  await prisma.notificationLog.createMany({
    data: results.map((result) => {
      const originalMessage = messageByTarget[result.target];
      return {
        appointmentId,
        target: result.target === "client" ? "CLIENT" : "PROFESSIONAL",
        status: result.ok ? "SENT" : "FAILED",
        destination: originalMessage.to,
        message: originalMessage.text,
        providerMessageId: result.ok ? result.result.messageId ?? null : null,
        error: result.ok ? null : result.error
      };
    })
  });
}

