import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { deallocateServer, deleteServer } from "@/lib/azure-server";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  const forbidden = requireAdmin(session);
  if (forbidden) return forbidden;

  const { id } = await params;
  const body = await req.json();
  const action = String(body?.action ?? "");

  const server = await prisma.gameServer.findUnique({
    where: { id },
  });

  if (!server) {
    return NextResponse.json({ error: "Server not found" }, { status: 404 });
  }

  if (action === "deallocate") {
    await deallocateServer(id);
    return NextResponse.json({ success: true });
  }

  if (action === "delete") {
    await deleteServer(id);
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
