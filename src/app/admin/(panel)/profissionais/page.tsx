import { revalidatePath } from "next/cache";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

async function createProfessional(formData: FormData) {
  "use server";
  const serviceIds = formData.getAll("serviceIds").map(String);
  await prisma.$transaction(async (tx) => {
    const professional = await tx.professional.create({
      data: {
        name: String(formData.get("name")),
        phone: String(formData.get("phone")),
        specialties: String(formData.get("specialties")),
        active: formData.get("active") === "on"
      }
    });

    if (serviceIds.length > 0) {
      await tx.professionalService.createMany({
        data: serviceIds.map((serviceId) => ({ professionalId: professional.id, serviceId })),
        skipDuplicates: true
      });
    }
  });
  revalidatePath("/admin/profissionais");
  revalidatePath("/agendar");
}

async function toggleProfessional(formData: FormData) {
  "use server";
  await prisma.professional.update({
    where: { id: String(formData.get("id")) },
    data: { active: formData.get("active") === "true" }
  });
  revalidatePath("/admin/profissionais");
  revalidatePath("/agendar");
}

async function updateProfessional(formData: FormData) {
  "use server";
  const id = String(formData.get("id"));
  const serviceIds = formData.getAll("serviceIds").map(String);
  await prisma.$transaction(async (tx) => {
    await tx.professional.update({
      where: { id },
      data: {
        name: String(formData.get("name")),
        phone: String(formData.get("phone")),
        specialties: String(formData.get("specialties"))
      }
    });
    await tx.professionalService.deleteMany({ where: { professionalId: id } });
    if (serviceIds.length > 0) {
      await tx.professionalService.createMany({
        data: serviceIds.map((serviceId) => ({ professionalId: id, serviceId })),
        skipDuplicates: true
      });
    }
  });
  revalidatePath("/admin/profissionais");
  revalidatePath("/agendar");
}

async function deleteProfessional(formData: FormData) {
  "use server";
  await prisma.professional.delete({ where: { id: String(formData.get("id")) } });
  revalidatePath("/admin/profissionais");
  revalidatePath("/agendar");
}

export default async function ProfessionalsPage() {
  const [professionals, services] = await Promise.all([
    prisma.professional.findMany({
      include: { services: { include: { service: true } } },
      orderBy: { createdAt: "desc" }
    }),
    prisma.service.findMany({ orderBy: { name: "asc" } })
  ]);

  return (
    <section className="grid gap-6 lg:grid-cols-[380px_1fr]">
      <form action={createProfessional} className="rounded-[20px] border border-white bg-white/95 p-5 shadow-xl shadow-blue-950/5">
        <p className="text-sm font-semibold text-[#0F5EF7]">Equipe</p>
        <h1 className="font-display mt-1 text-xl font-semibold text-[#082F8B]">Nova profissional</h1>
        <div className="mt-4 space-y-3">
          <Input name="name" placeholder="Nome" required />
          <Input name="phone" placeholder="WhatsApp" required />
          <Textarea name="specialties" placeholder="Especialidades" required />
          <fieldset className="rounded-[16px] border border-blue-100 bg-blue-50/50 p-3">
            <legend className="px-1 text-sm font-semibold text-[#082F8B]">Servicos que atende</legend>
            <div className="mt-2 grid gap-2">
              {services.map((service) => (
                <label key={service.id} className="flex items-center gap-2 text-sm font-medium text-slate-600">
                  <input name="serviceIds" type="checkbox" value={service.id} defaultChecked={service.active} />
                  {service.name}
                </label>
              ))}
            </div>
          </fieldset>
          <label className="flex items-center gap-2 text-sm font-semibold text-[#082F8B]">
            <input name="active" type="checkbox" defaultChecked />
            Ativa
          </label>
          <Button className="w-full">Salvar profissional</Button>
        </div>
      </form>

      <div className="rounded-[20px] border border-white bg-white/95 shadow-xl shadow-blue-950/5">
        <div className="border-b border-blue-50 p-5">
          <h2 className="font-display text-xl font-semibold text-[#082F8B]">Profissionais cadastradas</h2>
        </div>
        <div className="divide-y divide-blue-50">
          {professionals.map((professional) => (
            <div key={professional.id} className="p-5">
              <form action={updateProfessional} className="grid gap-3 lg:grid-cols-[1fr_160px_1fr_auto] lg:items-end">
                <input type="hidden" name="id" value={professional.id} />
                <label className="space-y-1.5 text-sm font-semibold text-[#082F8B]">
                  Nome
                  <Input name="name" defaultValue={professional.name} required />
                </label>
                <label className="space-y-1.5 text-sm font-semibold text-[#082F8B]">
                  WhatsApp
                  <Input name="phone" defaultValue={professional.phone} required />
                </label>
                <label className="space-y-1.5 text-sm font-semibold text-[#082F8B]">
                  Especialidades
                  <Input name="specialties" defaultValue={professional.specialties} required />
                </label>
                <div className="space-y-1.5 lg:col-span-3">
                  <p className="text-sm font-semibold text-[#082F8B]">Servicos que atende</p>
                  <div className="grid gap-2 rounded-[16px] border border-blue-100 bg-blue-50/40 p-3 sm:grid-cols-2">
                    {services.map((service) => (
                      <label key={service.id} className="flex items-center gap-2 text-sm font-medium text-slate-600">
                        <input
                          name="serviceIds"
                          type="checkbox"
                          value={service.id}
                          defaultChecked={professional.services.some((item) => item.serviceId === service.id)}
                        />
                        {service.name}
                      </label>
                    ))}
                  </div>
                </div>
                <Button variant="secondary">Atualizar</Button>
              </form>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap gap-2">
                  <p className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-[#22C55E]">{professional.active ? "ativa" : "inativa"}</p>
                  {professional.services.map((item) => (
                    <p key={item.serviceId} className="rounded-full bg-blue-50 px-3 py-1 text-sm font-semibold text-[#0F5EF7]">
                      {item.service.name}
                    </p>
                  ))}
                  {professional.services.length === 0 && (
                    <p className="rounded-full bg-amber-50 px-3 py-1 text-sm font-semibold text-amber-700">sem servico vinculado</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <form action={toggleProfessional}>
                    <input type="hidden" name="id" value={professional.id} />
                    <input type="hidden" name="active" value={String(!professional.active)} />
                    <Button variant="secondary">{professional.active ? "Desativar" : "Ativar"}</Button>
                  </form>
                  <form action={deleteProfessional}>
                    <input type="hidden" name="id" value={professional.id} />
                    <Button variant="danger">Excluir</Button>
                  </form>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
