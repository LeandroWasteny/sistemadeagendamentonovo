import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/session";
import {
  getWhatsappConnectionState,
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

export async function DELETE() {
  await requireAdmin();
  return NextResponse.json(await stopWhatsappConnection());
}

