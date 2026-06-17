import pino from "pino";
import QRCode from "qrcode";
import type { WhatsappMessage } from "./templates";

type BaileysSocket = {
  ev: {
    on: (event: string, listener: (...args: never[]) => void) => void;
  };
  sendMessage: (jid: string, content: { text: string }) => Promise<unknown>;
  logout: () => Promise<void>;
  end?: (error?: Error) => void;
};

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
  const authDir = process.env.WHATSAPP_AUTH_DIR ?? "baileys-auth";
  const { state, saveCreds } = await useMultiFileAuthState(authDir);
  const socket = makeWASocket({
    auth: state,
    logger: pino({ level: "silent" }),
    printQRInTerminal: false
  }) as BaileysSocket;

  baileysGlobal.baileysSocket = socket;
  socket.ev.on("creds.update", saveCreds as (...args: never[]) => void);
  socket.ev.on("connection.update", async (update: never) => {
    const connectionUpdate = update as {
      connection?: string;
      qr?: string;
      lastDisconnect?: { error?: { message?: string } };
    };

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
    socket.end?.();
  }
  setState({
    status: "DISCONNECTED",
    qr: undefined,
    qrImage: undefined,
    message: "WhatsApp desconectado."
  });
  return getState();
}

export async function sendWithBaileys(message: WhatsappMessage) {
  await startWhatsappConnection();
  const socket = baileysGlobal.baileysSocket;
  const state = getState();

  if (!socket || state.status !== "CONNECTED") {
    throw new Error("WhatsApp ainda nao esta conectado. Gere e leia o QR Code no admin.");
  }

  await socket.sendMessage(`${message.to}@s.whatsapp.net`, { text: message.text });
  return { ok: true, mode: "baileys" };
}
