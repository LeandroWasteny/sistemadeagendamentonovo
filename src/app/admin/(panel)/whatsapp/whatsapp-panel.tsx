"use client";

import { useEffect, useState } from "react";
import { Loader2, Plug, Unplug } from "lucide-react";
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
    try {
      const response = await fetch("/api/admin/whatsapp", { cache: "no-store" });
      setState(await response.json());
    } catch {
      setState((current) => current ?? null);
    }
  }

  async function connect() {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/whatsapp", { method: "POST" });
      setState(await response.json());
    } finally {
      setLoading(false);
    }
  }

  async function disconnect() {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/whatsapp", { method: "DELETE" });
      setState(await response.json());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadStatus();
    const timer = window.setInterval(loadStatus, 4000);
    return () => window.clearInterval(timer);
  }, []);

  const status = state?.status ?? "DISCONNECTED";

  return (
    <div className="grid gap-5 lg:grid-cols-[420px_1fr]">
      <div className="rounded-[20px] border border-white bg-white/95 p-5 shadow-xl shadow-blue-950/5">
        <h2 className="font-display text-xl font-semibold text-[#082F8B]">Conexao Baileys</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Clique em conectar, aguarde o QR Code e leia pelo WhatsApp em aparelhos conectados.
        </p>
        <div className="mt-5 rounded-[14px] bg-blue-50 px-3 py-2 text-sm text-[#082F8B]">
          Status: <strong>{status}</strong>
        </div>
        {state?.message && <p className="mt-3 text-sm text-slate-600">{state.message}</p>}
        <div className="mt-5 flex flex-wrap gap-2">
          <Button className="gap-2" onClick={connect} disabled={loading || status === "CONNECTED"}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plug className="h-4 w-4" />}
            Conectar
          </Button>
          <Button variant="danger" className="gap-2" onClick={disconnect} disabled={loading}>
            <Unplug className="h-4 w-4" />
            Desconectar
          </Button>
        </div>
        <p className="mt-3 text-xs leading-5 text-slate-500">
          Desconectar remove a sessao local e tenta remover este sistema da lista de aparelhos conectados no celular.
        </p>
      </div>

      <div className="rounded-[20px] border border-white bg-white/95 p-5 shadow-xl shadow-blue-950/5">
        <h2 className="font-display text-xl font-semibold text-[#082F8B]">QR Code</h2>
        {state?.qrImage ? (
          <div className="mt-5 flex flex-col items-start gap-4">
            <img src={state.qrImage} alt="QR Code do WhatsApp" className="h-72 w-72 rounded-[16px] border border-blue-100 bg-white p-2" />
            <textarea readOnly value={state.qr ?? ""} className="min-h-24 w-full rounded-[14px] border border-blue-100 p-3 text-xs text-slate-500 outline-none" />
          </div>
        ) : (
          <p className="mt-5 rounded-[16px] bg-[#F3F4F6] px-3 py-6 text-center text-sm text-slate-500">
            Nenhum QR Code disponivel no momento.
          </p>
        )}
      </div>
    </div>
  );
}
