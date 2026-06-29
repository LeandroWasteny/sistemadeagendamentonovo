import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

const scheduleSchema = z.object({
  professionalId: z.string().trim().min(1).max(128),
  dayOfWeek: z.coerce.number().int().min(0).max(6),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  intervalMinutes: z.coerce.number().int().min(5).max(240),
  active: z.boolean().optional()
}).refine((data) => timeToMinutes(data.startTime) < timeToMinutes(data.endTime), {
  message: "Horario inicial deve ser menor que o final.",
  path: ["endTime"]
});

export async function GET() {
  await requireAdmin();
  return NextResponse.json(
    await prisma.professionalSchedule.findMany({
      include: {
        professional: {
          include: { services: { include: { service: true } } }
        }
      },
      orderBy: [{ professional: { name: "asc" } }, { dayOfWeek: "asc" }, { startTime: "asc" }]
    })
  );
}

export async function POST(request: Request) {
  await requireAdmin();
  const input = scheduleSchema.safeParse(await request.json());
  if (!input.success) {
    return NextResponse.json({ error: "Dados invalidos." }, { status: 400 });
  }

  const professional = await prisma.professional.findUnique({
    where: { id: input.data.professionalId },
    select: { id: true }
  });
  if (!professional) {
    return NextResponse.json({ error: "Profissional nao encontrada." }, { status: 404 });
  }

  const duplicate = await prisma.professionalSchedule.findFirst({
    where: {
      professionalId: input.data.professionalId,
      dayOfWeek: input.data.dayOfWeek,
      startTime: input.data.startTime,
      endTime: input.data.endTime
    },
    select: { id: true }
  });
  if (duplicate) {
    return NextResponse.json({ error: "Horario ja cadastrado para essa profissional." }, { status: 409 });
  }

  const schedule = await prisma.professionalSchedule.create({
    data: {
      professionalId: input.data.professionalId,
      dayOfWeek: input.data.dayOfWeek,
      startTime: input.data.startTime,
      endTime: input.data.endTime,
      intervalMinutes: input.data.intervalMinutes,
      active: Boolean(input.data.active)
    }
  });
  revalidatePath("/admin");
  revalidatePath("/admin/horarios");
  revalidatePath("/admin/profissionais");
  revalidatePath("/agendar");
  return NextResponse.json(schedule);
}

function timeToMinutes(value: string) {
  const [hour, minute] = value.split(":").map(Number);
  return hour * 60 + minute;
}
