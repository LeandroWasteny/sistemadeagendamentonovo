import { revalidatePath } from "next/cache";
import { Button } from "@/components/ui/button";
import { buildAppointmentMessages } from "@/lib/notifications/templates";
import { sendAppointmentNotifications } from "@/lib/notifications/whatsapp";
import { prisma } from "@/lib/prisma";
import { statusLabel } from "@/lib/utils";

async function updateAppointmentStatus(formData: FormData) {
  "use server";
  const appointment = await prisma.appointment.update({
    where: { id: String(formData.get("id")) },
    data: { status: String(formData.get("status")) as "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED" },
    include: { service: true, professional: true }
  });

  await sendAppointmentNotifications(
    buildAppointmentMessages({
      clientName: appointment.clientName,
      clientPhone: appointment.clientPhone,
      professionalName: appointment.professional.name,
      professionalPhone: appointment.professional.phone,
      serviceName: appointment.service.name,
      startsAt: appointment.startsAt,
      status: appointment.status
    })
  );

  revalidatePath("/admin/agendamentos");
  revalidatePath("/admin");
}

export default async function AppointmentsPage() {
  const appointments = await prisma.appointment.findMany({
    include: { service: true, professional: true },
    orderBy: { startsAt: "desc" }
  });

  return (
    <section>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Agendamentos</h1>
        <p className="mt-1 text-sm text-zinc-500">Confirme, cancele ou conclua atendimentos.</p>
      </div>
      <div className="rounded-lg border border-zinc-200 bg-white shadow-sm">
        <div className="divide-y divide-zinc-100">
          {appointments.map((appointment) => (
            <div key={appointment.id} className="grid gap-4 p-5 lg:grid-cols-[1fr_auto] lg:items-center">
              <div>
                <p className="font-medium">{appointment.clientName} - {appointment.service.name}</p>
                <p className="text-sm text-zinc-500">
                  {appointment.professional.name} em {new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(appointment.startsAt)}
                </p>
                <p className="text-sm text-zinc-500">WhatsApp: {appointment.clientPhone} - Status: {statusLabel(appointment.status)}</p>
                {appointment.notes && <p className="mt-1 text-sm text-zinc-600">{appointment.notes}</p>}
              </div>
              <div className="flex flex-wrap gap-2">
                {["CONFIRMED", "CANCELLED", "COMPLETED"].map((status) => (
                  <form key={status} action={updateAppointmentStatus}>
                    <input type="hidden" name="id" value={appointment.id} />
                    <input type="hidden" name="status" value={status} />
                    <Button variant={status === "CANCELLED" ? "danger" : "secondary"}>
                      {statusLabel(status)}
                    </Button>
                  </form>
                ))}
              </div>
            </div>
          ))}
          {appointments.length === 0 && <p className="p-5 text-sm text-zinc-500">Nenhum agendamento cadastrado.</p>}
        </div>
      </div>
    </section>
  );
}

