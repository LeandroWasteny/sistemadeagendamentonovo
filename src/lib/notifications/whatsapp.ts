import type { WhatsappMessage } from "./templates";
import { sendWithBaileys } from "./baileys-manager";

export async function sendWhatsappMessage(message: WhatsappMessage) {
  if (process.env.WHATSAPP_MODE !== "baileys") {
    console.log(`[whatsapp:mock] ${message.to}: ${message.text}`);
    return { ok: true, mode: "mock" };
  }

  return sendWithBaileys(message);
}

export async function sendAppointmentNotifications(messages: {
  client: WhatsappMessage;
  professional: WhatsappMessage;
}) {
  await Promise.all([
    sendWhatsappMessage(messages.client),
    sendWhatsappMessage(messages.professional)
  ]);
}
