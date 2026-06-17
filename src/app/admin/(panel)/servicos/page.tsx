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
  revalidatePath("/admin/servicos");
}

async function toggleService(formData: FormData) {
  "use server";
  await prisma.service.update({
    where: { id: String(formData.get("id")) },
    data: { active: formData.get("active") === "true" }
  });
  revalidatePath("/admin/servicos");
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
  revalidatePath("/admin/servicos");
}

async function deleteService(formData: FormData) {
  "use server";
  await prisma.service.delete({ where: { id: String(formData.get("id")) } });
  revalidatePath("/admin/servicos");
}

export default async function ServicesPage() {
  const services = await prisma.service.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <section className="grid gap-6 lg:grid-cols-[380px_1fr]">
      <form action={createService} className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
        <h1 className="text-xl font-semibold">Novo servico</h1>
        <div className="mt-4 space-y-3">
          <Input name="name" placeholder="Nome" required />
          <Textarea name="description" placeholder="Descricao" required />
          <Input name="durationMinutes" type="number" min="15" step="15" placeholder="Duracao em minutos" required />
          <Input name="price" type="number" min="0" step="0.01" placeholder="Preco" required />
          <label className="flex items-center gap-2 text-sm">
            <input name="active" type="checkbox" defaultChecked />
            Ativo
          </label>
          <Button className="w-full">Salvar servico</Button>
        </div>
      </form>

      <div className="rounded-lg border border-zinc-200 bg-white shadow-sm">
        <div className="border-b border-zinc-200 p-5">
          <h2 className="text-xl font-semibold">Servicos cadastrados</h2>
        </div>
        <div className="divide-y divide-zinc-100">
          {services.map((service) => (
            <div key={service.id} className="p-5">
              <form action={updateService} className="grid gap-3 lg:grid-cols-[1fr_1fr_110px_110px_auto] lg:items-end">
                <input type="hidden" name="id" value={service.id} />
                <label className="space-y-1 text-sm font-medium">
                  Nome
                  <Input name="name" defaultValue={service.name} required />
                </label>
                <label className="space-y-1 text-sm font-medium">
                  Descricao
                  <Input name="description" defaultValue={service.description} required />
                </label>
                <label className="space-y-1 text-sm font-medium">
                  Minutos
                  <Input name="durationMinutes" type="number" min="15" step="15" defaultValue={service.durationMinutes} required />
                </label>
                <label className="space-y-1 text-sm font-medium">
                  Preco
                  <Input name="price" type="number" min="0" step="0.01" defaultValue={service.priceCents / 100} required />
                </label>
                <Button variant="secondary">Atualizar</Button>
              </form>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm text-zinc-500">{formatCurrency(service.priceCents)} - {service.active ? "ativo" : "inativo"}</p>
                <div className="flex gap-2">
                  <form action={toggleService}>
                    <input type="hidden" name="id" value={service.id} />
                    <input type="hidden" name="active" value={String(!service.active)} />
                    <Button variant="secondary">{service.active ? "Desativar" : "Ativar"}</Button>
                  </form>
                  <form action={deleteService}>
                    <input type="hidden" name="id" value={service.id} />
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
