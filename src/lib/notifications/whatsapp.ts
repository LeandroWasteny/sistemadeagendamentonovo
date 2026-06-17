import type { WhatsappMessage } from "./templates";
import { sendWithBaileys } from "./baileys-manager";

type WhatsappSendResult = {
  ok: boolean;
  mode: string;
  jid?: string;
  messageId?: string | null;
};

export type AppointmentNotificationResult =
  | {
      target: "client" | "professional";
      ok: true;
      result: WhatsappSendResult;
    }
  | {
      target: "client" | "professional";
      ok: false;
      error: string;
    };

export async function sendWhatsappMessage(message: WhatsappMessage) {
  if (process.env.WHATSAPP_MODE !== "baileys") {
    console.log(`[whatsapp:mock] ${message.to}: ${message.text}`);
    return { ok: true, mode: "mock", messageId: null };
  }

  return sendWithBaileys(message);
}

export async function sendAppointmentNotifications(messages: {
  client: WhatsappMessage;
  professional: WhatsappMessage;
}): Promise<AppointmentNotificationResult[]> {
  const entries = [
    { target: "client", message: messages.client },
    { target: "professional", message: messages.professional }
  ] as const;

  return Promise.all(
    entries.map(async (entry) => {
      try {
        const result = await sendWhatsappMessage(entry.message);
        return { target: entry.target, ok: true, result };
      } catch (error) {
        const message = error instanceof Error ? error.message : "Falha desconhecida";
        console.error(`[whatsapp] falha ao enviar para ${entry.target}: ${message}`);
        return { target: entry.target, ok: false, error: message };
      }
    })
  );
}
