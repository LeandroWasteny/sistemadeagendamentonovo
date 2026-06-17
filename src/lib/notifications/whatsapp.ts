import type { WhatsappMessage } from "./templates";

export async function sendWhatsappMessage(message: WhatsappMessage) {
  if (process.env.WHATSAPP_MODE !== "baileys") {
    console.log(`[whatsapp:mock] ${message.to}: ${message.text}`);
    return { ok: true, mode: "mock" };
  }

  const { default: makeWASocket, useMultiFileAuthState } = await import("@whiskeysockets/baileys");
  const authDir = process.env.WHATSAPP_AUTH_DIR ?? "baileys-auth";
  const { state, saveCreds } = await useMultiFileAuthState(authDir);
  const socket = makeWASocket({ auth: state, printQRInTerminal: true });
  socket.ev.on("creds.update", saveCreds);
  await socket.sendMessage(`${message.to}@s.whatsapp.net`, { text: message.text });
  return { ok: true, mode: "baileys" };
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

