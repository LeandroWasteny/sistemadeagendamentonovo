import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const cookieName = "agendamento_session";

type SessionPayload = {
  userId: string;
  email: string;
  expiresAt: number;
};

export async function createSession(payload: Omit<SessionPayload, "expiresAt">) {
  const expiresAt = Date.now() + 1000 * 60 * 60 * 8;
  const body = Buffer.from(JSON.stringify({ ...payload, expiresAt })).toString("base64url");
  const signature = sign(body);
  const cookieStore = await cookies();
  cookieStore.set(cookieName, `${body}.${signature}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(expiresAt)
  });
}

export async function destroySession() {
  const cookieStore = await cookies();
  cookieStore.delete(cookieName);
}

export async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(cookieName)?.value;
  if (!token) return null;

  const [body, signature] = token.split(".");
  if (!body || !signature || !safeEqual(signature, sign(body))) return null;

  const payload = JSON.parse(Buffer.from(body, "base64url").toString()) as SessionPayload;
  if (payload.expiresAt < Date.now()) return null;
  return payload;
}

export async function requireAdmin() {
  const session = await getSession();
  if (!session) redirect("/admin/login");
  return session;
}

function sign(value: string) {
  return createHmac("sha256", process.env.SESSION_SECRET ?? "dev-secret")
    .update(value)
    .digest("base64url");
}

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

