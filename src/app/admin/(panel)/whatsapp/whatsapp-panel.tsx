"use client";

import { useEffect, useState } from "react";
import { Loader2, Plug, RefreshCw, Unplug } from "lucide-react";
import { Button } from "@/components/ui/button";

type WhatsappState = {
  status: "DISCONNECTED" | "CONNECTING" | "QR_READY" | "CONNECTED" | "ERROR";
  qr?: string;
  qrImage?: string;
  message?: string;
  updatedAt: string;
};

export function WhatsappPanel() {
  const [state, setState] = useState<WhatsappState | null>(null);
  const [loading, setLoading] = useState(false);

  async function loadStatus() {
    const response = await fetch("/api/admin/whatsapp", { cache: "no-store" });
    setState(await response.json());
  }

  async function connect() {
    setLoading(true);
    const response = await fetch("/api/admin/whatsapp", { method: "POST" });
    setState(await response.json());
    setLoading(false);
  }

  async function disconnect() {
    setLoading(true);
    const response = await fetch("/api/admin/whatsapp", { method: "DELETE" });
    setState(await response.json());
    setLoading(false);
  }

  useEffect(() => {
    loadStatus();
    const timer = window.setInterval(loadStatus, 4000);
    return () => window.clearInterval(timer);
  }, []);

  const status = state?.status ?? "DISCONNECTED";

  return (
    <div className="grid gap-5 lg:grid-cols-[420px_1fr]">
      <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
        <h2 className="text-xl font-semibold">Conexao Baileys</h2>
        <p className="mt-2 text-sm leading-6 text-zinc-600">
          Clique em conectar, aguarde o QR Code e leia pelo WhatsApp em aparelhos conectados.
        </p>
        <div className="mt-5 rounded-md bg-zinc-100 px-3 py-2 text-sm">
          Status: <strong>{status}</strong>
        </div>
        {state?.message && <p className="mt-3 text-sm text-zinc-600">{state.message}</p>}
        <div className="mt-5 flex flex-wrap gap-2">
          <Button className="gap-2" onClick={connect} disabled={loading || status === "CONNECTED"}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plug className="h-4 w-4" />}
            Conectar
          </Button>
          <Button variant="secondary" className="gap-2" onClick={loadStatus}>
            <RefreshCw className="h-4 w-4" />
            Atualizar
          </Button>
          <Button variant="danger" className="gap-2" onClick={disconnect} disabled={loading}>
            <Unplug className="h-4 w-4" />
            Desconectar
          </Button>
        </div>
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
        <h2 className="text-xl font-semibold">QR Code</h2>
        {state?.qrImage ? (
          <div className="mt-5 flex flex-col items-start gap-4">
            <img src={state.qrImage} alt="QR Code do WhatsApp" className="h-72 w-72 rounded-md border border-zinc-200 bg-white p-2" />
            <textarea readOnly value={state.qr ?? ""} className="min-h-24 w-full rounded-md border border-zinc-200 p-3 text-xs text-zinc-500" />
          </div>
        ) : (
          <p className="mt-5 rounded-md bg-zinc-100 px-3 py-6 text-center text-sm text-zinc-500">
            Nenhum QR Code disponivel no momento.
          </p>
        )}
      </div>
    </div>
  );
}

