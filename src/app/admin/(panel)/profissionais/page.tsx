import { revalidatePath } from "next/cache";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { prisma } from "@/lib/prisma";

async function createProfessional(formData: FormData) {
  "use server";
  await prisma.professional.create({
    data: {
      name: String(formData.get("name")),
      phone: String(formData.get("phone")),
      specialties: String(formData.get("specialties")),
      active: formData.get("active") === "on"
    }
  });
  revalidatePath("/admin/profissionais");
}

async function toggleProfessional(formData: FormData) {
  "use server";
  await prisma.professional.update({
    where: { id: String(formData.get("id")) },
    data: { active: formData.get("active") === "true" }
  });
  revalidatePath("/admin/profissionais");
}

async function updateProfessional(formData: FormData) {
  "use server";
  await prisma.professional.update({
    where: { id: String(formData.get("id")) },
    data: {
      name: String(formData.get("name")),
      phone: String(formData.get("phone")),
      specialties: String(formData.get("specialties"))
    }
  });
  revalidatePath("/admin/profissionais");
}

async function deleteProfessional(formData: FormData) {
  "use server";
  await prisma.professional.delete({ where: { id: String(formData.get("id")) } });
  revalidatePath("/admin/profissionais");
}

export default async function ProfessionalsPage() {
  const professionals = await prisma.professional.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <section className="grid gap-6 lg:grid-cols-[380px_1fr]">
      <form action={createProfessional} className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
        <h1 className="text-xl font-semibold">Nova profissional</h1>
        <div className="mt-4 space-y-3">
          <Input name="name" placeholder="Nome" required />
          <Input name="phone" placeholder="WhatsApp" required />
          <Textarea name="specialties" placeholder="Especialidades" required />
          <label className="flex items-center gap-2 text-sm">
            <input name="active" type="checkbox" defaultChecked />
            Ativa
          </label>
          <Button className="w-full">Salvar profissional</Button>
        </div>
      </form>

      <div className="rounded-lg border border-zinc-200 bg-white shadow-sm">
        <div className="border-b border-zinc-200 p-5">
          <h2 className="text-xl font-semibold">Profissionais cadastradas</h2>
        </div>
        <div className="divide-y divide-zinc-100">
          {professionals.map((professional) => (
            <div key={professional.id} className="p-5">
              <form action={updateProfessional} className="grid gap-3 lg:grid-cols-[1fr_160px_1fr_auto] lg:items-end">
                <input type="hidden" name="id" value={professional.id} />
                <label className="space-y-1 text-sm font-medium">
                  Nome
                  <Input name="name" defaultValue={professional.name} required />
                </label>
                <label className="space-y-1 text-sm font-medium">
                  WhatsApp
                  <Input name="phone" defaultValue={professional.phone} required />
                </label>
                <label className="space-y-1 text-sm font-medium">
                  Especialidades
                  <Input name="specialties" defaultValue={professional.specialties} required />
                </label>
                <Button variant="secondary">Atualizar</Button>
              </form>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm text-zinc-500">{professional.active ? "ativa" : "inativa"}</p>
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
