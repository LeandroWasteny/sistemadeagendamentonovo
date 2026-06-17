import { statusLabel } from "@/lib/utils";

type AppointmentMessageInput = {
  clientName: string;
  clientPhone: string;
  professionalName: string;
  professionalPhone: string;
  serviceName: string;
  startsAt: Date;
  status: string;
};

export type WhatsappMessage = {
  to: string;
  text: string;
};

export function buildAppointmentMessages(input: AppointmentMessageInput) {
  const date = new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(input.startsAt);
  const status = statusLabel(input.status);

  return {
    client: {
      to: normalizeBrazilPhone(input.clientPhone),
      text: `Ola, ${input.clientName}! Seu agendamento de ${input.serviceName} com ${input.professionalName} esta ${status} para ${date}.`
    },
    professional: {
      to: normalizeBrazilPhone(input.professionalPhone),
      text: `Ola, ${input.professionalName}! Novo agendamento ${status}: ${input.clientName} marcou ${input.serviceName} para ${date}.`
    }
  };
}

export function normalizeBrazilPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  const country = process.env.DEFAULT_COUNTRY_CODE ?? "55";
  return digits.startsWith(country) ? digits : `${country}${digits}`;
}

