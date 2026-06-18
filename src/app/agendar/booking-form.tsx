"use client";

import { useEffect, useMemo, useState } from "react";
import { Calendar, CheckCircle2, Clock3, Loader2, Send, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency } from "@/lib/utils";

type ServiceOption = {
  id: string;
  name: string;
  durationMinutes: number;
  priceCents: number;
};

type ProfessionalOption = {
  id: string;
  name: string;
  specialties: string;
};

type Slot = {
  time: string;
  startsAt: string;
};

export function BookingForm({
  services,
  professionals
}: {
  services: ServiceOption[];
  professionals: ProfessionalOption[];
}) {
  const tomorrow = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() + 1);
    return date.toISOString().slice(0, 10);
  }, []);

  const [serviceId, setServiceId] = useState(services[0]?.id ?? "");
  const [professionalId, setProfessionalId] = useState(professionals[0]?.id ?? "");
  const [date, setDate] = useState(tomorrow);
  const [slot, setSlot] = useState("");
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!serviceId || !professionalId || !date) return;
    setLoadingSlots(true);
    setSlot("");
    fetch(`/api/availability?serviceId=${serviceId}&professionalId=${professionalId}&date=${date}`)
      .then((response) => response.json())
      .then((data) => setSlots(data.slots ?? []))
      .finally(() => setLoadingSlots(false));
  }, [serviceId, professionalId, date]);

  async function handleSubmit(formData: FormData) {
    setSaving(true);
    setMessage("");
    const response = await fetch("/api/appointments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        serviceId,
        professionalId,
        startsAt: slot,
        clientName: formData.get("clientName"),
        clientPhone: formData.get("clientPhone"),
        notes: formData.get("notes")
      })
    });
    const data = await response.json();
    setSaving(false);
    if (response.ok) {
      const failedNotifications = data.notifications?.filter((item: { ok: boolean }) => !item.ok) ?? [];
      setMessage(
        failedNotifications.length > 0
          ? "Agendamento criado, mas alguma notificacao do WhatsApp falhou. A equipe pode reenviar pelo admin."
          : "Agendamento criado e notificacoes enviadas."
      );
    } else {
      setMessage(data.error);
    }
    if (response.ok) setSlot("");
  }

  const selectedService = services.find((service) => service.id === serviceId);

  return (
    <form
      action={handleSubmit}
      className="rounded-[24px] border border-white bg-white/95 p-4 shadow-2xl shadow-blue-950/10 backdrop-blur md:p-6"
    >
      <div className="mb-5 flex items-center justify-between gap-3 border-b border-blue-50 pb-5">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-[16px] bg-[#0F5EF7] text-white shadow-lg shadow-blue-500/20">
            <Calendar className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-display text-xl font-semibold text-[#082F8B]">Novo agendamento</h2>
            <p className="text-sm text-slate-500">Preencha os dados para reservar seu horario.</p>
          </div>
        </div>
        <div className="hidden rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-[#22C55E] sm:block">
          Online
        </div>
      </div>

      <div className="mb-5 grid gap-2 sm:grid-cols-3">
        {["Servico", "Horario", "Contato"].map((step, index) => (
          <div key={step} className="flex items-center gap-2 rounded-[14px] bg-[#F3F4F6] px-3 py-2 text-sm font-semibold text-[#082F8B]">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-xs text-[#0F5EF7] shadow-sm">
              {index + 1}
            </span>
            {step}
          </div>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-1.5 text-sm font-semibold text-[#082F8B]">
          Servico
          <Select value={serviceId} onChange={(event) => setServiceId(event.target.value)} required>
            {services.map((service) => (
              <option key={service.id} value={service.id}>
                {service.name} - {formatCurrency(service.priceCents)}
              </option>
            ))}
          </Select>
        </label>
        <label className="space-y-1.5 text-sm font-semibold text-[#082F8B]">
          Profissional
          <Select value={professionalId} onChange={(event) => setProfessionalId(event.target.value)} required>
            {professionals.map((professional) => (
              <option key={professional.id} value={professional.id}>
                {professional.name}
              </option>
            ))}
          </Select>
        </label>
        <label className="space-y-1.5 text-sm font-semibold text-[#082F8B]">
          Data
          <Input type="date" value={date} min={new Date().toISOString().slice(0, 10)} onChange={(event) => setDate(event.target.value)} required />
        </label>
        <label className="space-y-1.5 text-sm font-semibold text-[#082F8B]">
          Horario
          <Select value={slot} onChange={(event) => setSlot(event.target.value)} required>
            <option value="">{loadingSlots ? "Carregando..." : "Selecione"}</option>
            {slots.map((item) => (
              <option key={item.startsAt} value={item.startsAt}>
                {item.time}
              </option>
            ))}
          </Select>
        </label>
      </div>

      {selectedService && (
        <div className="mt-4 flex items-center gap-3 rounded-[16px] border border-blue-100 bg-blue-50/70 px-4 py-3 text-sm text-[#082F8B]">
          <span className="flex h-9 w-9 items-center justify-center rounded-[12px] bg-white text-[#0F5EF7] shadow-sm">
            <Clock3 className="h-4 w-4" />
          </span>
          <div>
            <p className="font-semibold">{selectedService.name}</p>
            <p className="text-slate-600">Duracao estimada: {selectedService.durationMinutes} minutos.</p>
          </div>
        </div>
      )}

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <label className="space-y-1.5 text-sm font-semibold text-[#082F8B]">
          Nome
          <Input name="clientName" required placeholder="Nome do cliente" />
        </label>
        <label className="space-y-1.5 text-sm font-semibold text-[#082F8B]">
          WhatsApp
          <Input name="clientPhone" required placeholder="85999990000" />
        </label>
      </div>
      <label className="mt-4 block space-y-1.5 text-sm font-semibold text-[#082F8B]">
        Observacao
        <Textarea name="notes" placeholder="Opcional" />
      </label>

      <Button className="mt-5 h-12 w-full gap-2 text-base" disabled={saving || !slot}>
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        Confirmar agendamento
      </Button>

      {message && (
        <p className="mt-4 flex items-center gap-2 rounded-[16px] border border-emerald-100 bg-emerald-50 px-3 py-3 text-sm font-medium text-emerald-700">
          {message.includes("falhou") ? <Sparkles className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
          {message}
        </p>
      )}
    </form>
  );
}
