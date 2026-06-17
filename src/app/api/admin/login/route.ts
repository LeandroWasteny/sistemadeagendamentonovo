import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

export async function POST(request: Request) {
  const input = schema.safeParse(await request.json());
  if (!input.success) {
    return NextResponse.json({ error: "Login invalido." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email: input.data.email } });
  if (!user || !(await verifyPassword(input.data.password, user.passwordHash))) {
    return NextResponse.json({ error: "E-mail ou senha invalidos." }, { status: 401 });
  }

  await createSession({ userId: user.id, email: user.email });
  return NextResponse.json({ ok: true });
}

