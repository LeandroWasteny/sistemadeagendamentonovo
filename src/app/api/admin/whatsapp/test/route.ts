import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/session";
import { normalizeBrazilPhone } from "@/lib/notifications/templates";
import { sendWhatsappMessage } from "@/lib/notifications/whatsapp";

const schema = z.object({
  phone: z.string().min(8),
  text: z.string().min(1)
});

export async function POST(request: Request) {
  await requireAdmin();
  const input = schema.safeParse(await request.json());

  if (!input.success) {
    return NextResponse.json({ error: "Telefone ou mensagem invalidos." }, { status: 400 });
  }

  try {
    const result = await sendWhatsappMessage({
      to: normalizeBrazilPhone(input.data.phone),
      text: input.data.text
    });
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha desconhecida";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
