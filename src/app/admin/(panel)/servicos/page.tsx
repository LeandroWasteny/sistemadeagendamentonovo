import { revalidatePath } from "next/cache";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";

async function createService(formData: FormData) {
  "use server";
  await prisma.service.create({
    data: {
      name: String(formData.get("name")),
      description: String(formData.get("description")),
      durationMinutes: Number(formData.get("durationMinutes")),
      priceCents: Math.round(Number(formData.get("price")) * 100),
      active: formData.get("active") === "on"
    }
  });
  revalidatePath("/admin");
  revalidatePath("/admin/servicos");
  revalidatePath("/agendar");
}

async function toggleService(formData: FormData) {
  "use server";
  await prisma.service.update({
    where: { id: String(formData.get("id")) },
    data: { active: formData.get("active") === "true" }
  });
  revalidatePath("/admin");
  revalidatePath("/admin/servicos");
  revalidatePath("/agendar");
}

async function updateService(formData: FormData) {
  "use server";
  await prisma.service.update({
    where: { id: String(formData.get("id")) },
    data: {
      name: String(formData.get("name")),
      description: String(formData.get("description")),
      durationMinutes: Number(formData.get("durationMinutes")),
      priceCents: Math.round(Number(formData.get("price")) * 100)
    }
  });
  revalidatePath("/admin");
  revalidatePath("/admin/servicos");
  revalidatePath("/agendar");
}

async function deleteService(formData: FormData) {
  "use server";
  await prisma.service.delete({ where: { id: String(formData.get("id")) } });
  revalidatePath("/admin");
  revalidatePath("/admin/servicos");
  revalidatePath("/agendar");
}

export default async function ServicesPage() {
  const services = await prisma.service.findMany({
    include: { professionals: { include: { professional: true } } },
    orderBy: { createdAt: "desc" }
  });

  return (
    <section className="grid min-w-0 gap-6 lg:grid-cols-[minmax(300px,380px)_minmax(0,1fr)]">
      <form action={createService} className="min-w-0 rounded-[20px] border border-white bg-white/95 p-5 shadow-xl shadow-blue-950/5">
        <p className="text-sm font-semibold text-[#0F5EF7]">Catalogo</p>
        <h1 className="font-display mt-1 text-xl font-semibold text-[#082F8B]">Novo servico</h1>
        <div className="mt-4 space-y-3">
          <Input name="name" placeholder="Nome" required />
          <Textarea name="description" placeholder="Descricao" required />
          <Input name="durationMinutes" type="number" min="15" step="15" placeholder="Duracao em minutos" required />
          <Input name="price" type="number" min="0" step="0.01" placeholder="Preco" required />
          <label className="flex items-center gap-2 text-sm font-semibold text-[#082F8B]">
            <input name="active" type="checkbox" defaultChecked />
            Ativo
          </label>
          <Button className="w-full">Salvar servico</Button>
        </div>
      </form>

      <div className="min-w-0 overflow-hidden rounded-[20px] border border-white bg-white/95 shadow-xl shadow-blue-950/5">
        <div className="border-b border-blue-50 p-5">
          <h2 className="font-display text-xl font-semibold text-[#082F8B]">Servicos cadastrados</h2>
        </div>
        <div className="divide-y divide-blue-50">
          {services.map((service) => (
            <div key={service.id} className="p-5">
              <form action={updateService} className="grid min-w-0 gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_110px_110px_auto] xl:items-end">
                <input type="hidden" name="id" value={service.id} />
                <label className="space-y-1.5 text-sm font-semibold text-[#082F8B]">
                  Nome
                  <Input name="name" defaultValue={service.name} required />
                </label>
                <label className="space-y-1.5 text-sm font-semibold text-[#082F8B]">
                  Descricao
                  <Input name="description" defaultValue={service.description} required />
                </label>
                <label className="space-y-1.5 text-sm font-semibold text-[#082F8B]">
                  Minutos
                  <Input name="durationMinutes" type="number" min="15" step="15" defaultValue={service.durationMinutes} required />
                </label>
                <label className="space-y-1.5 text-sm font-semibold text-[#082F8B]">
                  Preco
                  <Input name="price" type="number" min="0" step="0.01" defaultValue={service.priceCents / 100} required />
                </label>
                <Button className="w-full xl:w-auto" variant="secondary">Atualizar</Button>
              </form>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex min-w-0 flex-wrap gap-2">
                  <p className="rounded-full bg-blue-50 px-3 py-1 text-sm font-semibold text-[#0F5EF7]">{formatCurrency(service.priceCents)} - {service.active ? "ativo" : "inativo"}</p>
                  {service.professionals.map((item) => (
                    <p key={item.professionalId} className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-[#22C55E]">
                      {item.professional.name}
                    </p>
                  ))}
                  {service.professionals.length === 0 && (
                    <p className="rounded-full bg-amber-50 px-3 py-1 text-sm font-semibold text-amber-700">sem profissional</p>
                  )}
                </div>
                <div className="flex w-full flex-wrap gap-2 sm:w-auto">
                  <form action={toggleService} className="min-w-[132px] flex-1 sm:flex-none">
                    <input type="hidden" name="id" value={service.id} />
                    <input type="hidden" name="active" value={String(!service.active)} />
                    <Button className="w-full" variant="secondary">{service.active ? "Desativar" : "Ativar"}</Button>
                  </form>
                  <form action={deleteService} className="min-w-[132px] flex-1 sm:flex-none">
                    <input type="hidden" name="id" value={service.id} />
                    <Button className="w-full" variant="danger">Excluir</Button>
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
