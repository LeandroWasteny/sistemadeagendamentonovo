import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/session";
import {
  getWhatsappConnectionState,
  resetWhatsappConnection,
  startWhatsappConnection,
  stopWhatsappConnection
} from "@/lib/notifications/baileys-manager";

export async function GET() {
  await requireAdmin();
  return NextResponse.json(getWhatsappConnectionState());
}

export async function POST() {
  await requireAdmin();
  return NextResponse.json(await startWhatsappConnection());
}

export async function DELETE(request: Request) {
  await requireAdmin();
  const { searchParams } = new URL(request.url);
  if (searchParams.get("keepSession") !== "true") {
    return NextResponse.json(await resetWhatsappConnection());
  }
  return NextResponse.json(await stopWhatsappConnection());
}
