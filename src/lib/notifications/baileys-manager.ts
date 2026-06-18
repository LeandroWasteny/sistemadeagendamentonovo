import { rm } from "fs/promises";
import pino from "pino";
import QRCode from "qrcode";
import type makeWASocket from "baileys";
import type { WhatsappMessage } from "./templates";

type BaileysSocket = ReturnType<typeof makeWASocket>;

type WhatsappConnectionState = {
  status: "DISCONNECTED" | "CONNECTING" | "QR_READY" | "CONNECTED" | "ERROR";
  qr?: string;
  qrImage?: string;
  message?: string;
  updatedAt: string;
};

type BaileysGlobal = typeof globalThis & {
  baileysSocket?: BaileysSocket;
  baileysState?: WhatsappConnectionState;
  baileysManualStop?: boolean;
};

const baileysGlobal = globalThis as BaileysGlobal;

function getState(): WhatsappConnectionState {
  if (!baileysGlobal.baileysState) {
    baileysGlobal.baileysState = {
      status: "DISCONNECTED",
      updatedAt: new Date().toISOString()
    };
  }
  return baileysGlobal.baileysState;
}

function setState(state: Partial<WhatsappConnectionState>) {
  baileysGlobal.baileysState = {
    ...getState(),
    ...state,
    updatedAt: new Date().toISOString()
  };
}

export function getWhatsappConnectionState() {
  return getState();
}

export async function startWhatsappConnection() {
  if (process.env.WHATSAPP_MODE !== "baileys") {
    setState({
      status: "CONNECTED",
      message: "Modo mock ativo. Altere WHATSAPP_MODE=baileys para gerar QR Code."
    });
    return getState();
  }

  if (baileysGlobal.baileysSocket && getState().status !== "ERROR") {
    return getState();
  }

  setState({ status: "CONNECTING", message: "Criando conexao com WhatsApp..." });
  baileysGlobal.baileysManualStop = false;

  const { default: makeWASocket, useMultiFileAuthState } = await import("baileys");
  const authDir = getAuthDir();
  const { state, saveCreds } = await useMultiFileAuthState(authDir);
  const socket = makeWASocket({
    auth: state,
    logger: pino({ level: "silent" }),
    printQRInTerminal: false
  });

  baileysGlobal.baileysSocket = socket;
  socket.ev.on("creds.update", saveCreds);
  socket.ev.on("connection.update", async (connectionUpdate) => {
    if (connectionUpdate.qr) {
      setState({
        status: "QR_READY",
        qr: connectionUpdate.qr,
        qrImage: await QRCode.toDataURL(connectionUpdate.qr),
        message: "Leia o QR Code pelo WhatsApp em aparelhos conectados."
      });
    }

    if (connectionUpdate.connection === "open") {
      setState({
        status: "CONNECTED",
        qr: undefined,
        qrImage: undefined,
        message: "WhatsApp conectado."
      });
    }

    if (connectionUpdate.connection === "close") {
      baileysGlobal.baileysSocket = undefined;
      setState({
        status: "DISCONNECTED",
        message: connectionUpdate.lastDisconnect?.error?.message ?? "Conexao encerrada."
      });
      if (!baileysGlobal.baileysManualStop) {
        setTimeout(() => {
          startWhatsappConnection().catch((error) => {
            setState({ status: "ERROR", message: error.message });
          });
        }, 1500);
      }
    }
  });

  return getState();
}

export async function stopWhatsappConnection() {
  const socket = baileysGlobal.baileysSocket;
  baileysGlobal.baileysManualStop = true;
  baileysGlobal.baileysSocket = undefined;
  if (socket) {
    await socket.logout().catch(() => undefined);
    const closableSocket = socket as unknown as { end?: (error?: Error) => void };
    closableSocket.end?.();
  }
  setState({
    status: "DISCONNECTED",
    qr: undefined,
    qrImage: undefined,
    message: "WhatsApp desconectado."
  });
  return getState();
}

export async function resetWhatsappConnection() {
  await stopWhatsappConnection();
  await clearAuthState();
  setState({
    status: "DISCONNECTED",
    qr: undefined,
    qrImage: undefined,
    message: "Sessao antiga removida. Clique em conectar para gerar um novo QR Code."
  });
  return getState();
}

export async function sendWithBaileys(message: WhatsappMessage) {
  const socket = await waitForConnectedSocket();
  const jid = await resolveRecipientJid(socket, message.to);
  const result = await socket.sendMessage(jid, { text: message.text });

  console.log(`[whatsapp:baileys] mensagem enviada para ${maskPhone(message.to)} (${jid})`);
  return { ok: true, mode: "baileys", jid, messageId: result?.key?.id };
}

async function waitForConnectedSocket(timeoutMs = 20000) {
  await startWhatsappConnection();
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const socket = baileysGlobal.baileysSocket;
    if (socket && getState().status === "CONNECTED") {
      return socket;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error("WhatsApp ainda nao esta conectado. Gere e leia o QR Code no admin.");
}

async function resolveRecipientJid(socket: BaileysSocket, phone: string) {
  const candidates = buildBrazilPhoneCandidates(phone);

  for (const candidate of candidates) {
    const [result] = (await socket.onWhatsApp(candidate)) ?? [];
    if (result?.exists && result.jid) {
      return result.jid;
    }
  }

  throw new Error(`Numero ${maskPhone(phone)} nao encontrado no WhatsApp.`);
}

function buildBrazilPhoneCandidates(phone: string) {
  const digits = phone.replace(/\D/g, "");
  const candidates = [digits];

  if (digits.startsWith("55") && digits.length === 13 && digits[4] === "9") {
    candidates.push(`${digits.slice(0, 4)}${digits.slice(5)}`);
  }

  return [...new Set(candidates)];
}

function maskPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.length <= 4) return "****";
  return `${digits.slice(0, 4)}****${digits.slice(-2)}`;
}

function getAuthDir() {
  return process.env.WHATSAPP_AUTH_DIR ?? "baileys-auth";
}

async function clearAuthState() {
  await rm(getAuthDir(), { recursive: true, force: true });
}
