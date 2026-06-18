import { revalidatePath } from "next/cache";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const days = [
  { value: 0, label: "Domingo" },
  { value: 1, label: "Segunda" },
  { value: 2, label: "Terca" },
  { value: 3, label: "Quarta" },
  { value: 4, label: "Quinta" },
  { value: 5, label: "Sexta" },
  { value: 6, label: "Sabado" }
];

async function createSchedule(formData: FormData) {
  "use server";
  await prisma.professionalSchedule.create({
    data: {
      professionalId: String(formData.get("professionalId")),
      dayOfWeek: Number(formData.get("dayOfWeek")),
      startTime: String(formData.get("startTime")),
      endTime: String(formData.get("endTime")),
      intervalMinutes: Number(formData.get("intervalMinutes")),
      active: formData.get("active") === "on"
    }
  });
  revalidatePath("/admin");
  revalidatePath("/admin/horarios");
  revalidatePath("/agendar");
}

async function deleteSchedule(formData: FormData) {
  "use server";
  await prisma.professionalSchedule.delete({ where: { id: String(formData.get("id")) } });
  revalidatePath("/admin");
  revalidatePath("/admin/horarios");
  revalidatePath("/agendar");
}

export default async function SchedulesPage() {
  const [professionals, schedules] = await Promise.all([
    prisma.professional.findMany({
      where: { active: true },
      include: { services: { include: { service: true } } },
      orderBy: { name: "asc" }
    }),
    prisma.professionalSchedule.findMany({
      include: {
        professional: {
          include: { services: { include: { service: true } } }
        }
      },
      orderBy: [{ professional: { name: "asc" } }, { dayOfWeek: "asc" }, { startTime: "asc" }]
    })
  ]);

  return (
    <section className="grid gap-6 lg:grid-cols-[380px_1fr]">
      <form action={createSchedule} className="rounded-[20px] border border-white bg-white/95 p-5 shadow-xl shadow-blue-950/5">
        <p className="text-sm font-semibold text-[#0F5EF7]">Disponibilidade</p>
        <h1 className="font-display mt-1 text-xl font-semibold text-[#082F8B]">Novo horario</h1>
        <div className="mt-4 space-y-3">
          <Select name="professionalId" required>
            {professionals.map((professional) => (
              <option key={professional.id} value={professional.id}>
                {professional.name} - {professional.services.map((item) => item.service.name).join(", ") || "sem servico vinculado"}
              </option>
            ))}
          </Select>
          <Select name="dayOfWeek" required>
            {days.map((day) => (
              <option key={day.value} value={day.value}>{day.label}</option>
            ))}
          </Select>
          <Input name="startTime" type="time" required />
          <Input name="endTime" type="time" required />
          <Input name="intervalMinutes" type="number" min="15" step="15" defaultValue="30" required />
          <label className="flex items-center gap-2 text-sm font-semibold text-[#082F8B]">
            <input name="active" type="checkbox" defaultChecked />
            Ativo
          </label>
          <Button className="w-full">Salvar horario</Button>
        </div>
      </form>

      <div className="rounded-[20px] border border-white bg-white/95 shadow-xl shadow-blue-950/5">
        <div className="border-b border-blue-50 p-5">
          <h2 className="font-display text-xl font-semibold text-[#082F8B]">Horarios cadastrados</h2>
        </div>
        <div className="divide-y divide-blue-50">
          {schedules.map((schedule) => (
            <div key={schedule.id} className="flex flex-col gap-3 p-5 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="font-semibold text-[#082F8B]">{schedule.professional.name}</p>
                <p className="text-sm text-slate-500">
                  {days.find((day) => day.value === schedule.dayOfWeek)?.label}: {schedule.startTime} ate {schedule.endTime}, intervalo {schedule.intervalMinutes} min
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {schedule.professional.services.map((item) => (
                    <span key={item.serviceId} className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-[#0F5EF7]">
                      {item.service.name}
                    </span>
                  ))}
                  {schedule.professional.services.length === 0 && (
                    <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                      sem servico vinculado
                    </span>
                  )}
                </div>
              </div>
              <form action={deleteSchedule}>
                <input type="hidden" name="id" value={schedule.id} />
                <Button variant="danger">Excluir</Button>
              </form>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
